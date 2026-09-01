export function createCareerRecordRenderer({
  elements,
  registries,
  statLine,
  progressRow,
  renderList,
  documentProfile,
  recordReference,
  metricBlock,
  statusStamp,
  onOpenPromotionProgress,
}) {
  function render(state, career, assignment, squad) {
    elements.careerSummary.replaceChildren();
    const identity = document.createElement("div"); identity.className = "career-identity military-career-header";
    const rail=document.createElement("div");rail.className="document-rail career-document-rail";const railLabel=document.createElement("span");railLabel.textContent=documentProfile("career_record").label;const railRef=document.createElement("span");railRef.textContent=recordReference("career_record",state.playerPersonId);rail.append(railLabel,railRef);
    const name = document.createElement("h2"); name.textContent = `${career.rank.split(" · ")[0]} ${career.name}`;
    const sub = document.createElement("p"); sub.className = "muted career-subtitle"; sub.textContent = `${career.specialty} · ${career.component}`;
    const chain = document.createElement("p"); chain.className = "career-chain"; chain.textContent = assignment.chain.map(x => x.name).join(" › ");
    identity.append(rail,name, sub, chain);
    const chips = document.createElement("div"); chips.className = "status-chips";
    for (const text of [career.payGrade, career.role, `${squad.readiness}% ready`, `${squad.morale}% morale`]) { const chip=document.createElement("span"); chip.className="status-chip"; chip.textContent=text; chips.appendChild(chip); }
    const quick = document.createElement("div"); quick.className = "quick-stats"; quick.append(statLine("Experience", career.experience), statLine("Prestige", career.prestige), statLine("World Date", state.world.date));
    if(career.promotion.nextRank){const promoQuick=document.createElement("button");promoQuick.type="button";promoQuick.className="secondary promotion-quick-link";promoQuick.textContent=`Promotion: ${career.promotion.nextRank.abbreviation} · ${career.promotion.eligible?"Eligible":"View Progress"}`;promoQuick.addEventListener("click",()=>onOpenPromotionProgress());quick.appendChild(promoQuick);}
    const highlights=document.createElement("div");highlights.className="career-achievement-highlights";const highlightLabel=document.createElement("span");highlightLabel.className="achievement-highlight-label";highlightLabel.textContent="SERVICE RECORD HIGHLIGHTS";highlights.appendChild(highlightLabel);
    const weaponQual=career.qualifications.find(item=>item.category==="weapons"); if(weaponQual){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=`${weaponQual.name}: ${weaponQual.result?.toUpperCase()??"QUALIFIED"}${weaponQual.score!=null&&weaponQual.maxScore!=null?` ${weaponQual.score}/${weaponQual.maxScore}`:""}`;highlights.appendChild(chip);}
    for(const item of career.qualifications.filter(item=>item.category!=="weapons").slice(0,2)){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=item.name;highlights.appendChild(chip);}
    for(const item of career.awards.filter(item=>item.category==="badge").slice(0,2)){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=item.name;highlights.appendChild(chip);}
    if(highlights.childElementCount===1){const none=document.createElement("span");none.className="achievement-highlight empty-highlight";none.textContent="No qualifications or badges earned yet";highlights.appendChild(none);}
    elements.careerSummary.append(identity, chips, quick, highlights);

    elements.careerCard.replaceChildren(statLine("Name", career.name), statLine("Branch", career.branch), statLine("Component", career.component), statLine("MOS", career.specialty), statLine("Rank", career.rank), statLine("Pay Grade", career.payGrade), statLine("Role", career.role), statLine("Experience", career.experience), statLine("Prestige", career.prestige));
    elements.promotionCard.replaceChildren();
    if (!career.promotion.nextRank) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "No higher rank is defined in this foundation build."; elements.promotionCard.appendChild(p); elements.promote.disabled = true; }
    else {
      const promotionStatus=document.createElement("div");promotionStatus.className="promotion-status-grid";promotionStatus.append(metricBlock("CURRENT",career.rank.split(" · ")[0]),metricBlock("NEXT",career.promotion.nextRank.abbreviation),metricBlock("STATUS",career.promotion.eligible?"ELIGIBLE":"IN PROGRESS"));elements.promotionCard.appendChild(promotionStatus);
      const prog = career.promotion.progress ?? {};
      if (prog.requiredExperience) elements.promotionCard.append(progressRow("Experience", prog.experience, prog.requiredExperience));
      if (prog.requiredServiceDays) elements.promotionCard.append(progressRow("Time in Service", prog.serviceDays, prog.requiredServiceDays));
      if (prog.requiredGradeDays) elements.promotionCard.append(progressRow("Time in Grade", prog.gradeDays, prog.requiredGradeDays));
      if(prog.requiredQualifications?.length){const qualifications=document.createElement("div");qualifications.className="promotion-qualification-list";const h=document.createElement("strong");h.textContent="Required Qualifications / PME";qualifications.appendChild(h);for(const item of prog.requiredQualifications){const row=document.createElement("div");row.className=`promotion-qualification ${item.held?"complete":"missing"}`;row.textContent=`${item.held?"✓":"○"} ${item.name}`;qualifications.appendChild(row);}elements.promotionCard.appendChild(qualifications);}
      const blockers=document.createElement("div");blockers.className="promotion-blockers";const bh=document.createElement("strong");bh.textContent=career.promotion.eligible?"Eligibility":"Remaining Requirements";blockers.appendChild(bh);const reasonBox=document.createElement("div");renderList(reasonBox,career.promotion.reasons,"All current requirements are satisfied. Promotion can be processed when authorized.");blockers.appendChild(reasonBox);elements.promotionCard.appendChild(blockers); elements.promote.disabled = !career.promotion.eligible;
    }

    elements.schoolsAwards.replaceChildren();
    if(!career.education.length&&!career.qualifications.length&&!career.awards.length){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO MILITARY EDUCATION, QUALIFICATIONS, OR AWARDS RECORDED";elements.schoolsAwards.appendChild(empty);} else {
      const summary=document.createElement("div");summary.className="service-record-counts";for(const [label,value] of [["SCHOOLS",career.achievementCounts.schools],["QUALIFICATIONS",career.achievementCounts.qualifications],["BADGES/TABS",career.achievementCounts.badges],["RIBBONS/MEDALS",career.achievementCounts.ribbonsAndMedals]])summary.append(metricBlock(label,value));elements.schoolsAwards.appendChild(summary);
      const addGroup=(label,items,renderer)=>{if(!items.length)return;const h=document.createElement("h3");h.className="record-group-title";h.textContent=label;const records=document.createElement("div");records.className="record-strips";for(const item of items)records.appendChild(renderer(item));elements.schoolsAwards.append(h,records);};
      const linkedQualificationIds=new Set(),linkedAwardIds=new Set();
      if(career.education.length){const h=document.createElement("h3");h.className="record-group-title";h.textContent="School Achievements";const records=document.createElement("div");records.className="record-strips";for(const item of career.education){const cluster=document.createElement("div");cluster.className="achievement-cluster service-achievement-cluster";const schoolRow=document.createElement("div");schoolRow.className="record-strip";schoolRow.append(statusStamp("filled"),metricBlock("SCHOOL",item.name),metricBlock("STATUS",item.status.toUpperCase()),metricBlock("COMPLETED",item.completedDate??"—"));cluster.appendChild(schoolRow);for(const q of career.qualifications.filter(q=>q.schoolId===item.schoolId)){linkedQualificationIds.add(q.id);const row=document.createElement("div");row.className="record-strip achievement-child";const result=[q.result?.toUpperCase(),q.score!=null&&q.maxScore!=null?`${q.score}/${q.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(metricBlock("QUALIFICATION",q.name),metricBlock("RATING",result));cluster.appendChild(row);}for(const a of career.awards.filter(a=>a.sourceId===item.id||registries.awards.get(a.awardId)?.eligibilitySource===item.schoolId)){linkedAwardIds.add(a.id);const row=document.createElement("div");row.className="record-strip achievement-child";row.append(metricBlock(a.category.toUpperCase(),a.name),metricBlock("EARNED",a.earnedDate));cluster.appendChild(row);}records.appendChild(cluster);}elements.schoolsAwards.append(h,records);}
      addGroup("Other Qualifications",career.qualifications.filter(item=>!linkedQualificationIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";const result=[item.result?.toUpperCase(),item.score!=null&&item.maxScore!=null?`${item.score}/${item.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(statusStamp("filled"),metricBlock("QUALIFICATION",item.name),metricBlock("RATING",result),metricBlock(item.expiresDate?"EXPIRES":"COMPLETED",item.expiresDate??item.completedDate));return row;});
      addGroup("Other Badges & Tabs",career.awards.filter(item=>["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));if(item.reason)row.append(metricBlock("WHY EARNED",item.reason));return row;});
      addGroup("Ribbons, Medals & Decorations",career.awards.filter(item=>!["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));if(item.reason)row.append(metricBlock("WHY EARNED",item.reason));return row;});
    }

    elements.careerEvents.replaceChildren(...career.events.map(event => { const li = document.createElement("li"); li.className="service-record-entry"; const ref=document.createElement("span");ref.className="record-ref";ref.textContent=recordReference("service_record",event.id); const time = document.createElement("time"); time.textContent = event.date; const label=document.createElement("span");label.textContent=event.label; li.append(ref,time,label); return li; }));
  }

  return { render };
}
