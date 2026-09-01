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

    # Career tabs
    for tab in ['home','actions','soldier','records','inbox']:
      await page.click(f'[data-career-tab="{tab}"]')
      await page.wait_for_timeout(150)
      ok=await visible(f'[data-career-screen="{tab}"]')
      txt=(await page.locator(f'[data-career-screen="{tab}"]').inner_text())[:180] if ok else ''
      await check(f'career tab {tab}',ok,txt.replace('\n',' | '))
      if tab in ['actions','soldier','records','inbox']: await shot('career-'+tab)

    # Soldier identity subtabs: discover buttons inside soldier identity
    await page.click('[data-career-tab="soldier"]'); await page.wait_for_timeout(100)
    idbuttons=page.locator('#soldier-identity button')
    btntexts=await idbuttons.all_inner_texts()
    await check('soldier identity controls discovered',len(btntexts)>=4,repr(btntexts))
    for text in btntexts:
      t=text.strip()
      if t in ['Uniform','Loadout','Awards','Catalog','Record']:
        try:
          await idbuttons.get_by_text(t,exact=True).click(); await page.wait_for_timeout(120)
          await check('soldier identity '+t, True, (await page.locator('#soldier-identity').inner_text())[:120].replace('\n',' | '))
        except Exception as e: await check('soldier identity '+t,False,str(e))

    # Records / reenlistment button
    await page.click('[data-career-tab="records"]'); await page.wait_for_timeout(100)
    contract_details=page.locator('details[data-persist-key="career-contract"]')
    if await contract_details.count() and not await contract_details.evaluate('(d)=>d.open'):
      await contract_details.locator('summary').click(); await page.wait_for_timeout(80)
    service_txt=await page.locator('#service-career').inner_text()
    await check('service career rendered', await visible('#service-career') and len(service_txt.strip())>0, service_txt[:250].replace('\n',' | '))
    if await visible('#review-reenlistment') and await page.locator('#review-reenlistment').is_enabled():
      try:
        await page.click('#review-reenlistment'); await page.wait_for_timeout(100)
        await check('review reenlistment options clickable', True, (await page.locator('#reenlistment-offers').inner_text())[:180].replace('\n',' | '))
      except Exception as e: await check('review reenlistment options clickable',False,str(e))
    else: await check('review reenlistment presentation present', await page.locator('#review-reenlistment').count()==1, 'not currently enabled/eligible')

    # Primary views and Unit tabs
    for view in ['unit','personnel','orders','more','career']:
      await page.click(f'#bottom-nav [data-view="{view}"]'); await page.wait_for_timeout(120)
      await check(f'primary view {view}',await visible(f'.game-view[data-view="{view}"]'))
      if view=='unit':
        for tab in ['overview','roster','readiness','admin']:
          await page.click(f'[data-unit-tab="{tab}"]'); await page.wait_for_timeout(100)
          await check('unit tab '+tab,await visible(f'[data-unit-screen="{tab}"]'),(await page.locator(f'[data-unit-screen="{tab}"]').inner_text())[:160].replace('\n',' | '))
        admin_summary=(await page.locator('#administration-summary').inner_text()).strip()
        replacement_text=(await page.locator('#replacement-requests').inner_text()).strip()
        action_text=(await page.locator('#personnel-actions').inner_text()).strip()
        await check('phase12 administration summary rendered', len(admin_summary)>0 and 'active' in admin_summary.lower(), admin_summary[:220].replace('\n',' | '))
        await check('phase12 replacement requests rendered', len(replacement_text)>0, replacement_text[:220].replace('\n',' | '))
        await check('phase12 personnel actions rendered', len(action_text)>0, action_text[:220].replace('\n',' | '))
        await shot('unit-admin')
      elif view=='personnel':
        for tab in ['roster','relationships']:
          await page.click(f'[data-personnel-tab="{tab}"]'); await page.wait_for_timeout(100)
          await check('personnel tab '+tab,await visible(f'[data-personnel-screen="{tab}"]'),(await page.locator(f'[data-personnel-screen="{tab}"]').inner_text())[:160].replace('\n',' | '))
        await shot('personnel-bonds')
      elif view=='orders':
        await check('orders list rendered', await visible('#orders-list'),(await page.locator('#orders-list').inner_text())[:180].replace('\n',' | '))
      elif view=='more':
        await check('more career framework rendered',await visible('#career-framework'))
        await check('save button visible',await visible('#save-game'))
        await check('load button visible',await visible('#load-game'))

    # Personnel profile dialog: find first likely person-card button/link in roster
    await page.click('#bottom-nav [data-view="personnel"]'); await page.click('[data-personnel-tab="roster"]'); await page.wait_for_timeout(100)
    # inspect all buttons in personnel body, click first non-navigation button
    pbtns=page.locator('#unit-personnel button')
    texts=await pbtns.all_inner_texts()
    await check('personnel roster buttons discovered',len(texts)>0,repr(texts[:12]))
    opened=False
    uniform_profile_opened=False
    profile_name=''
    for i,t in enumerate(texts):
      if t.strip() and t.strip() not in ['Return to My Unit']:
        try:
          await pbtns.nth(i).click(); await page.wait_for_timeout(100)
          if await visible('#person-dialog'):
            opened=True
            profile_name=await page.locator('#person-profile-name').inner_text()
            if await page.locator('#person-dialog .profile-uniform-button').count():
              uniform_profile_opened=True
              break
            await page.click('#person-profile-close'); await page.wait_for_timeout(60)
        except: pass
    await check('person profile dialog opens',opened,profile_name)
    await check('tier-1 person profile found',uniform_profile_opened,profile_name)
    if uniform_profile_opened:
      await shot('person-profile')
      uniform_button=page.locator('#person-dialog .profile-uniform-button')
      await uniform_button.click(); await page.wait_for_timeout(80)
      await check('person profile uniform opens',await visible('#person-dialog .npc-uniform-preview'),(await page.locator('#person-dialog .npc-uniform-preview').inner_text())[:240])
      await check('person profile uniform populated',await page.locator('#person-dialog .npc-uniform-preview .uniform-blouse').count()>0)
      await uniform_button.click(); await page.wait_for_timeout(50)
      await check('person profile uniform closes',not await visible('#person-dialog .npc-uniform-preview'))
      await page.click('#person-profile-close'); await page.wait_for_timeout(80)
      await check('person profile closes',not await visible('#person-dialog'))

    # Unit -> Personnel cross navigation
    await page.click('#bottom-nav [data-view="unit"]'); await page.click('[data-unit-tab="roster"]'); await page.wait_for_timeout(100)
    if await visible('#view-selected-personnel') and await page.locator('#view-selected-personnel').is_enabled():
      await page.click('#view-selected-personnel'); await page.wait_for_timeout(100)
      await check('unit to personnel cross-navigation',await visible('.game-view[data-view="personnel"]'))

    # More -> Save manager presentation / save load
    await page.click('#bottom-nav [data-view="more"]'); await page.wait_for_timeout(100)
    if await visible('#save-game'):
      await page.click('#save-game'); await page.wait_for_timeout(100)
      await check('save manager opens in save mode',await page.locator('#save-dialog').evaluate('(d)=>d.open'),(await page.locator('#save-dialog-title').inner_text()))
      await shot('save-manager')
      # click first slot action if available, but avoid destructive delete if labels unclear
      sb=page.locator('#save-slots button')
      stexts=await sb.all_inner_texts()
      await check('save slots rendered',len(stexts)>0,repr(stexts[:12]))
      # choose button containing Save
      for i,t in enumerate(stexts):
        if 'save' in t.lower() and 'delete' not in t.lower():
          try: await sb.nth(i).click(); await page.wait_for_timeout(120); break
          except: pass
      if await page.locator('#save-dialog').evaluate('(d)=>d.open'): await page.click('#save-dialog-close'); await page.wait_for_timeout(80)
    if await visible('#load-game'):
      # Hardening fixtures: one damaged slot and one future/unsupported save format.
      await page.evaluate("""() => {
        localStorage.setItem('warSim_save_v3_slot_05','{damaged');
        localStorage.setItem('warSim_save_v3_slot_06',JSON.stringify({saveFormatVersion:999,worldState:{}}));
      }""")
      await page.click('#load-game'); await page.wait_for_timeout(100)
      await check('save manager opens in load mode',await page.locator('#save-dialog').evaluate('(d)=>d.open'),(await page.locator('#save-dialog-title').inner_text()))
      cards=page.locator('#save-slots .save-slot')
      card5=cards.filter(has=page.locator('h3',has_text='Save 5')).first
      card6=cards.filter(has=page.locator('h3',has_text='Save 6')).first
      text5=await card5.inner_text(); text6=await card6.inner_text()
      await check('damaged save classified', 'damaged' in text5.lower() and 'no valid recovery' in text5.lower(), text5)
      await check('damaged save load blocked', await card5.locator('button',has_text='Load').count()==0, text5)
      await check('unsupported save classified', 'not compatible' in text6.lower() and 'update war sim' in text6.lower(), text6)
      await check('unsupported save load blocked', await card6.locator('button',has_text='Load').count()==0, text6)
      if await page.locator('#save-dialog').evaluate('(d)=>d.open'): await page.click('#save-dialog-close'); await page.wait_for_timeout(80)
      await page.evaluate("""() => {
        for (const slot of ['slot_05','slot_06']) {
          localStorage.removeItem(`warSim_save_v3_${slot}`);
          localStorage.removeItem(`warSim_save_backup_v3_${slot}`);
        }
      }""")

    # Career actions: activity execution and AAR
    await page.click('#bottom-nav [data-view="career"]'); await page.click('[data-career-tab="actions"]'); await page.wait_for_timeout(120)
    abtns=page.locator('#activity-options button')
    atexts=await abtns.all_inner_texts(); await check('activity buttons discovered',len(atexts)>0,repr(atexts[:15]))
    activity_done=False
    for i,t in enumerate(atexts):
      try:
        if await abtns.nth(i).is_enabled():
          await abtns.nth(i).click(); await page.wait_for_timeout(150)
          if await visible('#result-dialog'):
            activity_done=True; break
      except: pass
    await check('activity executes to result dialog',activity_done,(await page.locator('#result-title').inner_text()) if activity_done else '')
    if activity_done:
      await shot('activity-aar'); await page.click('#result-close'); await page.wait_for_timeout(80)

    # Time advance 1/7/30 on whichever are enabled; close result and achievement dialogs as they queue.
    for days,sel in [(1,'#advance-1'),(7,'#advance-7'),(30,'#advance-30')]:
      try:
        if await visible(sel) and await page.locator(sel).is_enabled():
          await page.click(sel); await page.wait_for_timeout(200)
          await check(f'advance {days} days opens result',await visible('#result-dialog'),(await page.locator('#result-title').inner_text()) if await visible('#result-dialog') else '')
          if await visible('#result-dialog'): await page.click('#result-close'); await page.wait_for_timeout(100)
          # drain achievement queue max 10
          for _ in range(10):
            if not await visible('#achievement-dialog'): break
            await check(f'achievement dialog after advance {days}',True,(await page.locator('#achievement-title').inner_text()))
            await page.click('#achievement-ok'); await page.wait_for_timeout(80)
      except Exception as e: await check(f'advance {days} days',False,str(e))

    # Inbox actions after advancing
    await page.click('[data-career-tab="inbox"]'); await page.wait_for_timeout(120)
    inboxtext=(await page.locator('#career-inbox').inner_text())
    await check('inbox renders after time advances',await visible('#career-inbox'),inboxtext[:220].replace('\n',' | '))
    ibtns=page.locator('#career-inbox button'); itexts=await ibtns.all_inner_texts()
    await check('inbox interactive controls enumerated',True,repr(itexts[:20]))
    # click safe Ack/Archive/Open Opportunity one at a time if found
    for keyword in ['Acknowledge','Archive','Open Opportunity']:
      matches=page.locator('#career-inbox button',has_text=keyword)
      if await matches.count():
        try:
          await matches.first.click(); await page.wait_for_timeout(100)
          await check('inbox '+keyword,True)
          # return to inbox if navigation occurred
          await page.click('#bottom-nav [data-view="career"]'); await page.click('[data-career-tab="inbox"]'); await page.wait_for_timeout(80)
        except Exception as e: await check('inbox '+keyword,False,str(e))
      else: await check('inbox '+keyword+' availability',True,'no current matching notification')
    # mark all read / clear read
    for name,sel in [('mark all read','#mark-all-read'),('clear read','#clear-read')]:
      if await visible(sel) and await page.locator(sel).is_enabled():
        try: await page.click(sel); await page.wait_for_timeout(80); await check('inbox '+name,True)
        except Exception as e: await check('inbox '+name,False,str(e))

    # Promotion presentation/action if enabled
    await page.click('[data-career-tab="records"]'); await page.wait_for_timeout(80)
    if await visible('#promote-player') and await page.locator('#promote-player').is_enabled():
      try:
        await page.click('#promote-player'); await page.wait_for_timeout(120)
        await check('promotion request interaction',True)
        if await visible('#confirm-dialog'):
          await check('promotion confirm dialog',True,(await page.locator('#confirm-message').inner_text())[:150]); await page.click('#confirm-cancel')
      except Exception as e: await check('promotion request interaction',False,str(e))
    else: await check('promotion control present',await page.locator('#promote-player').count()==1,'currently unavailable/disabled')

    # Phase 10 Career Record presentation checks.
    await page.click('#bottom-nav [data-view="career"]'); await page.click('[data-career-tab="home"]'); await page.wait_for_timeout(80)
    summary_text=(await page.locator('#career-summary').inner_text()).strip()
    await check('phase10 career summary rendered', len(summary_text)>0 and 'SERVICE RECORD HIGHLIGHTS' in summary_text, summary_text[:260].replace('\n',' | '))
    await page.click('[data-career-tab="records"]'); await page.wait_for_timeout(80)
    career_card=(await page.locator('#career-card').inner_text()).strip()
    promotion=(await page.locator('#promotion-card').inner_text()).strip()
    awards_details=page.locator('details[data-persist-key="career-awards"]')
    if await awards_details.count() and not await awards_details.evaluate('(d)=>d.open'):
      await awards_details.locator('summary').click(); await page.wait_for_timeout(50)
    record_details=page.locator('details[data-persist-key="service-record"]')
    if await record_details.count() and not await record_details.evaluate('(d)=>d.open'):
      await record_details.locator('summary').click(); await page.wait_for_timeout(50)
    awards=(await page.locator('#schools-awards').inner_text()).strip()
    events=(await page.locator('#career-events').inner_text()).strip()
    await check('phase10 career card rendered', len(career_card)>0, career_card[:180].replace('\n',' | '))
    await check('phase10 promotion record rendered', len(promotion)>0, promotion[:220].replace('\n',' | '))
    await check('phase10 education awards record rendered', len(awards)>0, awards[:220].replace('\n',' | '))
    await check('phase10 service events rendered', len(events)>0, events[:220].replace('\n',' | '))
    promo_link=page.locator('.promotion-quick-link')
    await page.click('[data-career-tab="home"]'); await page.wait_for_timeout(50)
    if await promo_link.count():
      await promo_link.click(); await page.wait_for_timeout(100)
      await check('phase10 promotion quick link navigates to records', await visible('[data-career-screen="records"]'))
    else:
      await check('phase10 promotion quick link availability', True, 'no next rank for current generated state')

    # Phase 11 Career Gameplay / Actions presentation checks.
    await page.click('#bottom-nav [data-view="career"]'); await page.click('[data-career-tab="actions"]'); await page.wait_for_timeout(100)
    objectives=(await page.locator('#career-objectives').inner_text()).strip()
    current_duty=(await page.locator('#current-duty').inner_text()).strip()
    lookahead=(await page.locator('#next-30-days').inner_text()).strip()
    skills=(await page.locator('#skill-summary').inner_text()).strip()
    activities=page.locator('#activity-options .activity-option')
    await check('phase11 career objectives rendered', len(objectives)>0, objectives[:220].replace('\n',' | '))
    await check('phase11 current duty rendered', len(current_duty)>0, current_duty[:180].replace('\n',' | '))
    await check('phase11 next 30 days rendered', len(lookahead)>0, lookahead[:220].replace('\n',' | '))
    await check('phase11 skills rendered', len(skills)>0, skills[:220].replace('\n',' | '))
    await check('phase11 activity cards rendered', await activities.count()>0, str(await activities.count()))
    duty_details=page.locator('details[data-persist-key="duty-schedule"]')
    if await duty_details.count() and not await duty_details.evaluate('(d)=>d.open'):
      await duty_details.locator('summary').click(); await page.wait_for_timeout(50)
    duty_text=(await page.locator('#duty-schedule').inner_text()).strip()
    await check('phase11 duty schedule rendered', len(duty_text)>0, duty_text[:240].replace('\n',' | '))
    opp_details=page.locator('details[data-persist-key="career-opportunities"]')
    if await opp_details.count() and not await opp_details.evaluate('(d)=>d.open'):
      await opp_details.locator('summary').click(); await page.wait_for_timeout(50)
    opp_text=(await page.locator('#career-opportunities').inner_text()).strip()
    await check('phase11 opportunities rendered', len(opp_text)>0, opp_text[:220].replace('\n',' | '))
    school_details=page.locator('details[data-persist-key="career-development"]')
    if await school_details.count() and not await school_details.evaluate('(d)=>d.open'):
      await school_details.locator('summary').click(); await page.wait_for_timeout(50)
    school_text=(await page.locator('#school-catalog').inner_text()).strip()
    await check('phase11 school catalog rendered', len(school_text)>0, school_text[:260].replace('\n',' | '))
    # Final state / browser errors
    await check('final app error hidden' ,not await visible('#app-error'),(await page.locator('#app-error-message').inner_text()) if await visible('#app-error') else '')
    await check('zero page exceptions',len(results['errors'])==0,repr(results['errors']))
    await check('zero console errors',len(results['console_errors'])==0,repr(results['console_errors']))
    await shot('99-final')
    # Save output
    (OUT/'results.json').write_text(json.dumps(results,indent=2))
    passed=sum(1 for c in results['checks'] if c['ok']); failed=sum(1 for c in results['checks'] if not c['ok'])
    print('SUMMARY',passed,'passed',failed,'failed')
    await browser.close()
    return failed

if __name__=='__main__':
  try: sys.exit(asyncio.run(main()))
  except Exception as e:
    print('HARNESS_FATAL',repr(e)); raise
