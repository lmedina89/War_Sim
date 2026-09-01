import asyncio, pathlib, re, json, hashlib, os, sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path(os.environ.get('WAR_SIM_BROWSER_OUT','/tmp/war-sim-browser-regression')); OUT.mkdir(parents=True,exist_ok=True)

# Parse static relative module dependencies. Project currently has no circular imports.
PATTERNS=[
 re.compile(r'(?m)(?:import|export)\s+(?:[^"\'\n]*?\s+from\s+)?(["\'])(\.{1,2}/[^"\']+)\1'),
 re.compile(r'import\s*\(\s*(["\'])(\.{1,2}/[^"\']+)\1\s*\)')
]
def deps_for(path):
    txt=path.read_text()
    deps=[]
    for pat in PATTERNS:
        for m in pat.finditer(txt): deps.append(m.group(2))
    out=[]
    for spec in deps:
        p=(path.parent/spec).resolve()
        if p.suffix=='': p=p.with_suffix('.js')
        if not p.exists(): raise FileNotFoundError(f'{path}: {spec} -> {p}')
        out.append((spec,p))
    return out

entry=ROOT/'src/app.js'
seen=set(); order=[]
def visit(path):
    if path in seen: return
    seen.add(path)
    for _,d in deps_for(path): visit(d)
    order.append(path)
visit(entry)
print('modules',len(order))

async def main():
  results={'checks':[], 'errors':[], 'console_errors':[], 'screenshots':[]}
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=await browser.new_context(viewport={'width':430,'height':932}, device_scale_factor=1)
    page=await ctx.new_page()
    page.on('pageerror', lambda e: results['errors'].append(str(e)))
    page.on('console', lambda m: results['console_errors'].append(m.text) if m.type=='error' else None)
    # load real HTML/CSS but remove external module script; set_content is allowed on existing blank page.
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<script\s+type=["\']module["\'][^>]*src=["\'][^"\']+["\'][^>]*>\s*</script>','',html, flags=re.I)
    # inline all stylesheet links
    def repl_css(m):
      href=m.group(1); path=(ROOT/href).resolve();
      return '<style>'+path.read_text()+'</style>' if path.exists() else m.group(0)
    html=re.sub(r'<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\'][^>]*>', repl_css, html, flags=re.I)
    await page.set_content(html, wait_until='domcontentloaded')
    # Opaque-origin Chromium policy workaround: provide browser-compatible in-memory storage
    # so War Sim's UI-only/save storage code executes normally during this harness run.
    await page.evaluate('''() => {
      const data = new Map();
      const storage = {
        get length(){ return data.size; },
        key(i){ return Array.from(data.keys())[i] ?? null; },
        getItem(k){ k=String(k); return data.has(k) ? data.get(k) : null; },
        setItem(k,v){ data.set(String(k),String(v)); },
        removeItem(k){ data.delete(String(k)); },
        clear(){ data.clear(); }
      };
      Object.defineProperty(window, 'localStorage', {value: storage, configurable: true});
      Object.defineProperty(window, 'sessionStorage', {value: storage, configurable: true});
    }''')
    # Build blob URLs bottom-up and rewrite exact import specifiers.
    urlmap={}
    for path in order:
      src=path.read_text()
      for spec,d in deps_for(path):
        u=urlmap[d]
        # replace only quoted specifier occurrences
        src=src.replace('"'+spec+'"','"'+u+'"').replace("'"+spec+"'", "'"+u+"'")
      u=await page.evaluate('(code)=>URL.createObjectURL(new Blob([code],{type:"text/javascript"}))',src)
      urlmap[path]=u
    await page.evaluate('(u)=>import(u)',urlmap[entry])
    await page.wait_for_timeout(500)

    async def check(name, ok, detail=''):
      results['checks'].append({'name':name,'ok':bool(ok),'detail':detail})
      print(('PASS' if ok else 'FAIL'), name, detail)
    async def visible(sel):
      try: return await page.locator(sel).is_visible()
      except: return False
    async def shot(name):
      path=OUT/f'{name}.png'; await page.screenshot(path=str(path), full_page=False); results['screenshots'].append(str(path))

    await check('startup new career visible', await visible('#new-career-panel'))
    await check('startup app error hidden', not await visible('#app-error'))
    await shot('00-startup')
    # Create career
    await page.fill('#first-name','Browser')
    await page.fill('#last-name','Tester')
    await page.fill('#world-seed','4311701')
    # choose first enabled non-empty options in selects
    for sel in ['#branch-select','#component-select','#specialty-select','#contract-select']:
      loc=page.locator(sel)
      if await loc.count():
        vals=await loc.locator('option:not([disabled])').evaluate_all('(opts)=>opts.map(o=>o.value).filter(Boolean)')
        if vals:
          try: await loc.select_option(vals[0])
          except: pass
          await page.wait_for_timeout(50)
    await page.click('button[type=submit]')
    await page.wait_for_timeout(700)
    await check('career content visible after creation', await visible('#career-content'))
    await check('situation strip visible', await visible('#situation-strip'))
    await check('persistent context visible', await visible('#persistent-world-context'))
    await check('post-create app error hidden', not await visible('#app-error'))
    # Drain startup achievement/notification queue before navigation.
    for _ in range(20):
      if await visible('#achievement-dialog'):
        await check('startup achievement dialog', True, (await page.locator('#achievement-title').inner_text()))
        await page.click('#achievement-ok'); await page.wait_for_timeout(50)
      elif await visible('#result-dialog'):
        await page.click('#result-close'); await page.wait_for_timeout(50)
      else:
        break
    await shot('01-career-home')


    async def overflow_snapshot(label):
      data=await page.evaluate("""() => {
        const vw=document.documentElement.clientWidth;
        const offenders=[];
        for (const el of document.querySelectorAll('body *')) {
          const cs=getComputedStyle(el);
          if (cs.display==='none' || cs.visibility==='hidden') continue;
          const r=el.getBoundingClientRect();
          if (r.width>0 && (r.right>vw+1 || r.left<-1)) {
            offenders.push({tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,80),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),vw});
          }
        }
        return {vw,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,offenders:offenders.slice(0,12)};
      }""")
      ok=data['doc']<=data['vw']+1 and data['body']<=data['vw']+1
      print(('PASS' if ok else 'FAIL'),'OVERFLOW',label,json.dumps(data))
      if not ok: results['errors'].append('overflow '+label+' '+json.dumps(data))

    sizes=[(320,568,'320x568'),(375,667,'375x667'),(390,844,'390x844'),(430,932,'430x932'),(932,430,'932x430-landscape')]
    for w,h,label in sizes:
      await page.set_viewport_size({'width':w,'height':h}); await page.wait_for_timeout(80)
      # Career tabs
      await page.click('#bottom-nav [data-view="career"]'); await page.wait_for_timeout(50)
      for tab in ['home','actions','soldier','records','inbox']:
        await page.click(f'[data-career-tab="{tab}"]'); await page.wait_for_timeout(50)
        await overflow_snapshot(label+' career '+tab)
      # soldier identity subtabs
      await page.click('[data-career-tab="soldier"]'); await page.wait_for_timeout(50)
      for t in ['Uniform','Loadout','Awards','Catalog','Record']:
        b=page.locator('#soldier-identity button',has_text=t)
        if await b.count():
          try: await b.first.click(); await page.wait_for_timeout(40)
          except: pass
          await overflow_snapshot(label+' soldier '+t)
      # primary views and their tabs
      for view in ['unit','personnel','orders','more']:
        await page.click(f'#bottom-nav [data-view="{view}"]'); await page.wait_for_timeout(50)
        await overflow_snapshot(label+' view '+view)
        if view=='unit':
          for tab in ['overview','roster','readiness','admin']:
            await page.click(f'[data-unit-tab="{tab}"]'); await page.wait_for_timeout(40); await overflow_snapshot(label+' unit '+tab)
        if view=='personnel':
          for tab in ['roster','relationships']:
            await page.click(f'[data-personnel-tab="{tab}"]'); await page.wait_for_timeout(40); await overflow_snapshot(label+' personnel '+tab)
      # save manager dialog geometry
      await page.click('#bottom-nav [data-view="more"]'); await page.wait_for_timeout(50)
      await page.click('#save-game'); await page.wait_for_timeout(50)
      await overflow_snapshot(label+' save dialog')
      d=await page.locator('#save-dialog .modal-card').bounding_box()
      print('DIALOG',label,d,'viewport',w,h)
      await page.click('#save-dialog-close'); await page.wait_for_timeout(40)
    print('MOBILE_AUDIT_ERRORS',results['errors'])
    await browser.close()
    if results['errors']:
      raise SystemExit(1)

if __name__=='__main__': asyncio.run(main())
