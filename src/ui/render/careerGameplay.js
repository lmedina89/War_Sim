export function createCareerGameplayRenderer({
  elements: els,
  registries,
  selectGameplay,
  selectSchoolCatalog,
  statusStamp,
  metricBlock,
  compactReference,
  progressRow,
  readUiArchive,
  archiveUiRecord,
  archiveUiRecords,
  createHistoryControls,
  careerHistoryPreviewLimit: CAREER_HISTORY_PREVIEW_LIMIT = 5,
  unitTrainingPreviewLimit: UNIT_TRAINING_PREVIEW_LIMIT = 4,
  situationFeedPreviewLimit: SITUATION_FEED_PREVIEW_LIMIT = 3,
  onRender = () => {},
  onShowDuty = () => {},
  onShowActivity = () => {},
  onAcceptOpportunity = () => {},
  onDeclineOpportunity = () => {},
  onResolveDecision = () => {},
  onPerformActivity = () => {},
  onRequestSchool = () => {},
} = {}) {
  function renderGameplay(state, indexes, personId) {
    const view = selectGameplay(state, indexes, registries, personId);
    if (!view) return;

    els.careerObjectives.replaceChildren();
    const activeObjectives=view.activeObjectives ?? view.objectives.filter(item=>item.status === "active");
    if (view.onboardingComplete) {
      const phase=document.createElement("div"); phase.className="career-phase-banner";
      const kicker=document.createElement("span"); kicker.textContent="CAREER PHASE";
      const strong=document.createElement("strong"); strong.textContent=view.trainingPhase?.name ?? "Garrison / Development";
      phase.append(kicker,strong); els.careerObjectives.appendChild(phase);
    }
    if (!activeObjectives.length) {
      const p=document.createElement("p"); p.className="empty-state military-empty objective-fallback";
      p.textContent=view.onboardingComplete ? "NO IMMEDIATE CAREER ACTIONS REQUIRED — CONTINUE NORMAL DUTY OR ADVANCE TIME" : "NO ACTIVE CAREER OBJECTIVES";
      els.careerObjectives.appendChild(p);
    } else for (const objective of activeObjectives) {
      const row=document.createElement("article"); row.className=`objective-row ${objective.status}`;
      const top=document.createElement("div"); top.className="objective-head"; const name=document.createElement("strong"); name.textContent=objective.name; top.append(name,statusStamp(objective.status));
      const desc=document.createElement("p"); desc.textContent=objective.description; row.append(top,desc); els.careerObjectives.appendChild(row);
    }
    els.next30Days?.replaceChildren();
    if(els.next30Days){
      const now=state.world.clock.elapsedDays;
      const items=[];
      for(const item of view.upcomingSchedule.filter(x=>x.startElapsedDay>=now&&x.startElapsedDay<=now+30))items.push({day:item.startElapsedDay,label:item.name,date:item.startDate,kind:"UNIT DUTY"});
      for(const item of view.opportunities.filter(x=>["accepted","in_progress"].includes(x.status)&&Number.isInteger(x.reportElapsedDay)&&x.reportElapsedDay<=now+30))items.push({day:item.reportElapsedDay,label:item.name,date:item.reportDate??state.world.date,kind:item.status==="in_progress"?"SCHOOL IN PROGRESS":"SCHOOL REPORT"});
      const qids=indexes.qualificationsByPersonId?.get(personId)??[];for(const id of qids){const q=state.entities.qualificationRecords[id];if(Number.isInteger(q?.expiresElapsedDay)&&q.expiresElapsedDay>=now&&q.expiresElapsedDay<=now+30){const def=registries.qualifications.get(q.qualificationId);items.push({day:q.expiresElapsedDay,label:`${def.name} expires`,date:q.expiresDate??"—",kind:"QUALIFICATION"});}}
      items.sort((a,b)=>a.day-b.day||a.label.localeCompare(b.label));
      if(!items.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="NO SIGNIFICANT MILESTONES IN THE NEXT 30 DAYS";els.next30Days.appendChild(empty);}else for(const item of items.slice(0,8)){const row=document.createElement("div");row.className="lookahead-row";const time=document.createElement("time");time.textContent=item.date;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.label;const small=document.createElement("span");small.textContent=`${item.kind} · IN ${Math.max(0,item.day-now)} DAY${item.day-now===1?"":"S"}`;body.append(strong,small);row.append(time,body);els.next30Days.appendChild(row);}
    }
    els.unitSituationFeed?.replaceChildren();
    if(els.unitSituationFeed){
      const feed=view.unitHistory??[];
      if(els.situationFeedCount) els.situationFeedCount.textContent=feed.length?`· ${feed.length}`:"";
      if(!feed.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="ROUTINE OPERATIONS — NO RECENT SIGNIFICANT UNIT EVENTS";els.unitSituationFeed.appendChild(empty);}
      else {
        const expanded=els.unitSituationFeed.dataset.expanded==="true";
        const shown=expanded?feed:feed.slice(0,SITUATION_FEED_PREVIEW_LIMIT);
        for(const item of shown){const row=document.createElement("div");row.className="situation-feed-row";const time=document.createElement("time");time.textContent=item.gameDate;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.title;const span=document.createElement("span");span.textContent=item.summary;body.append(strong,span);row.append(time,body);els.unitSituationFeed.appendChild(row);}
        if(feed.length>SITUATION_FEED_PREVIEW_LIMIT){const controls=document.createElement("div");controls.className="situation-feed-controls";const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary compact-button";toggle.textContent=expanded?"Show Recent":`Show All (${feed.length})`;toggle.setAttribute("aria-expanded",String(expanded));toggle.addEventListener("click",()=>{els.unitSituationFeed.dataset.expanded=expanded?"false":"true";onRender();});controls.appendChild(toggle);els.unitSituationFeed.appendChild(controls);}
      }
    }

    if ((view.objectiveHistory?.length ?? 0) > 0) {
      const archive=document.createElement("details"); archive.className="objective-archive";
      const summary=document.createElement("summary"); summary.textContent=`Completed Objective History (${view.objectiveHistory.length})`; archive.appendChild(summary);
      const body=document.createElement("div"); body.className="objective-history-list";
      for(const objective of view.objectiveHistory){
        const row=document.createElement("div"); row.className="objective-history-row";
        const label=document.createElement("strong");label.textContent=objective.name;
        const date=document.createElement("time");date.dateTime=objective.completedDate ?? objective.startedDate ?? "";date.textContent=objective.completedDate ?? objective.startedDate ?? "—";
        row.append(label,date);body.appendChild(row);
      }
      archive.appendChild(body); els.careerObjectives.appendChild(archive);
    }

    els.currentDuty.replaceChildren();
    if (view.currentDuty) {
      const duty=document.createElement("div"); duty.className="current-duty-card"; duty.append(statusStamp(view.currentDuty.status),metricBlock("CURRENT DUTY",view.currentDuty.name),metricBlock("THROUGH",view.currentDuty.endDate)); els.currentDuty.appendChild(duty);
    } else { const p=document.createElement("p"); p.className="empty-state compact-empty"; p.textContent="NO DUTY CURRENTLY IN PROGRESS"; els.currentDuty.appendChild(p); }

    if(els.trainingPhaseSummary) els.trainingPhaseSummary.textContent=view.trainingPhase ? `${view.trainingPhase.name} · ${view.trainingPhase.description}` : "Training phase unavailable.";
    els.dutySchedule.replaceChildren();
    if (view.routineSchedule?.length) {
      const routine=document.createElement("div"); routine.className="routine-duty-summary";
      const heading=document.createElement("strong"); heading.textContent="Routine Background Duties";
      const details=document.createElement("p");
      const next=view.routineSchedule[0];
      details.textContent=`${next.name} next ${next.startDate}${next.blocksFocusedActivities ? " · may restrict conflicting activities" : " · non-blocking routine duty"}`;
      routine.append(heading,details); els.dutySchedule.appendChild(routine);
    }
    if (!view.upcomingSchedule.length) { const p=document.createElement("p"); p.className="empty-state military-empty"; p.textContent="NO SIGNIFICANT UNIT DUTIES SCHEDULED"; els.dutySchedule.appendChild(p); }
    else for (const item of view.upcomingSchedule) {
      const row=document.createElement("article"); row.className=`schedule-row ${item.status}`;
      const date=document.createElement("time"); date.textContent=item.startDate === item.endDate ? item.startDate : `${item.startDate} → ${item.endDate}`;
      const body=document.createElement("div"); const h=document.createElement("strong"); h.textContent=item.name; const meta=document.createElement("span"); meta.textContent=`${item.category.toUpperCase()} · ${item.mandatory ? "MANDATORY" : "OPTIONAL"} · ${(item.planningStatus ?? "firm").toUpperCase()}`; body.append(h,meta);
      row.append(date,body,statusStamp(item.status)); els.dutySchedule.appendChild(row);
    }
    if(view.recentDuties.length){
      const archived=readUiArchive("unit-training",personId); const visible=view.recentDuties.filter(item=>!archived.has(item.id)); const archivedCount=view.recentDuties.length-visible.length; const expanded=els.dutySchedule.dataset.historyExpanded==="true";
      const significant=visible.filter(item=>item.dutyDefinitionId!=="duty_pt"); const pt=visible.filter(item=>item.dutyDefinitionId==="duty_pt"); const rows=[...significant];
      if(pt.length){ const newest=pt[0], oldest=pt.at(-1); rows.push({...newest,id:`pt-summary:${pt.map(x=>x.id).join(",")}`,isPtSummary:true,summaryIds:pt.map(x=>x.id),name:`Unit Physical Training · ${pt.length} session${pt.length===1?"":"s"}`,completedDate:pt.length===1?newest.completedDate:`${oldest.completedDate} → ${newest.completedDate}`}); }
      const heading=document.createElement("h3");heading.className="schedule-history-heading";heading.textContent="Recent Unit Training";els.dutySchedule.appendChild(heading);
      const history=document.createElement("div");history.className="duty-history"; const shown=expanded?rows:rows.slice(0,UNIT_TRAINING_PREVIEW_LIMIT);
      for(const item of shown){const row=document.createElement("div");row.className="history-row-shell";const button=document.createElement("button");button.type="button";button.className="duty-history-row";const text=document.createElement("span");text.textContent=`${item.completedDate} · ${item.name}`;const result=document.createElement("strong");result.textContent=item.isPtSummary?"ROUTINE":item.performanceRating?`${registries.performanceRatings.get(item.performanceRating)?.label ?? item.performanceRating} · ${item.performanceScore ?? "—"}/100`:"COMPLETED";button.append(text,result);if(!item.isPtSummary)button.addEventListener("click",()=>onShowDuty(item.id));else button.disabled=true;const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecords("unit-training",personId,item.isPtSummary?item.summaryIds:[item.id]));row.append(button,archive);history.appendChild(row);}els.dutySchedule.appendChild(history);
      const controls=createHistoryControls({kind:"unit-training",personId,hiddenCount:Math.max(0,rows.length-UNIT_TRAINING_PREVIEW_LIMIT),archivedCount,expanded,onToggle:()=>{els.dutySchedule.dataset.historyExpanded=expanded?"false":"true";onRender();}}); if(controls.childElementCount)els.dutySchedule.appendChild(controls);
    }

    els.careerOpportunities.replaceChildren();
    const visibleOpportunities=view.opportunities.filter(item=>["open","accepted","in_progress"].includes(item.status));
    if (!visibleOpportunities.length) { const p=document.createElement("p"); p.className="empty-state military-empty"; p.textContent="NO ACTIVE CAREER OPPORTUNITIES"; els.careerOpportunities.appendChild(p); }
    else for (const item of visibleOpportunities) {
      const card=document.createElement("article"); card.className="opportunity-card"; card.id=item.id; card.dataset.recordId=item.id; card.dataset.opportunityStatus=item.status;
      const rail=document.createElement("div"); rail.className="document-rail"; const label=document.createElement("span"); label.textContent="PERSONNEL OPPORTUNITY"; const ref=document.createElement("span"); ref.textContent=compactReference("OPP",item.id); rail.append(label,ref);
      const h=document.createElement("h3"); h.textContent=item.title; const p=document.createElement("p"); p.textContent=item.message;
      const metrics=document.createElement("div"); metrics.className="opportunity-metrics"; metrics.append(statusStamp(item.status)); if(item.sourceLabel) metrics.append(metricBlock("SOURCE",item.sourceLabel)); if(item.schoolName) metrics.append(metricBlock("SCHOOL",item.schoolName)); if(item.durationDays) metrics.append(metricBlock("DURATION",`${item.durationDays} days`)); if(item.status==="open") metrics.append(metricBlock("RESPOND",`${item.daysRemaining} days`)); if(item.reportDate) metrics.append(metricBlock("REPORT",item.reportDate));
      card.append(rail,h,p,metrics);
      if (item.status === "open") { const actions=document.createElement("div"); actions.className="actions opportunity-actions"; const accept=document.createElement("button"); accept.type="button"; accept.textContent="Accept Opportunity"; accept.addEventListener("click",()=>onAcceptOpportunity(item.id)); const decline=document.createElement("button"); decline.type="button"; decline.className="secondary"; decline.textContent="Decline"; decline.addEventListener("click",()=>onDeclineOpportunity(item.id)); actions.append(accept,decline); card.appendChild(actions); }
      els.careerOpportunities.appendChild(card);
    }

    els.skillSummary.replaceChildren();
    if(view.performanceIndex!=null){const perf=document.createElement("div");perf.className="performance-index";perf.append(metricBlock("RECENT PERFORMANCE",`${view.performanceIndex}/100`));els.skillSummary.appendChild(perf);}
    for (const skill of view.skills) { const row=document.createElement("div"); row.className="skill-row"; row.appendChild(progressRow(skill.name, skill.value, 100)); els.skillSummary.appendChild(row); }

    els.pendingDecisions.replaceChildren();
    for (const decision of view.pendingDecisions) {
      const card=document.createElement("article"); card.className="decision-card"; const h=document.createElement("h3"); h.textContent=decision.title; const p=document.createElement("p"); p.textContent=decision.message; card.append(h,p);
      if(decision.daysRemaining!=null){const deadline=document.createElement("p");deadline.className="decision-deadline";deadline.textContent=`Decision window: ${decision.daysRemaining} day${decision.daysRemaining===1?"":"s"}`;card.appendChild(deadline);}
      const actions=document.createElement("div"); actions.className="decision-choices"; for (const choice of decision.choices) { const b=document.createElement("button"); b.type="button"; b.textContent=choice.label; b.addEventListener("click",()=>onResolveDecision(personId,decision.id,choice.id)); actions.appendChild(b); } card.appendChild(actions); els.pendingDecisions.appendChild(card);
    }

    els.activityOptions.replaceChildren();
    for (const activity of view.activities) {
      const card=document.createElement("article"); card.className=`activity-option state-${activity.availabilityState}`;
      const meta=document.createElement("div"); meta.className="activity-meta"; meta.textContent=`${activity.durationDays} DAY${activity.durationDays===1?"":"S"} · ${activity.efficiency}% EFF`;
      const h=document.createElement("h3"); h.textContent=activity.name; const p=document.createElement("p"); p.textContent=activity.description; card.append(meta,h,p);
      if(activity.reasons.length){const reasons=document.createElement("p");reasons.className="activity-reasons";reasons.textContent=activity.reasons.join(" · ");card.appendChild(reasons);}
      const button=document.createElement("button"); button.type="button"; button.textContent=activity.eligible ? `Conduct ${activity.shortName}` : activity.availabilityState === "scheduled" ? "Schedule Conflict" : activity.availabilityState === "recovering" ? "Recovery Required" : "Unavailable"; button.disabled=!activity.eligible; button.addEventListener("click",()=>onPerformActivity(personId,activity.id)); card.appendChild(button); els.activityOptions.appendChild(card);
    }

    els.activityHistory.replaceChildren();
    const activityArchive=readUiArchive("activity-history",personId); const visibleActivities=view.recentActivities.filter(record=>!activityArchive.has(record.id)); const archivedActivityCount=view.recentActivities.length-visibleActivities.length; const activityExpanded=els.activityHistory.dataset.expanded==="true";
    if (!visibleActivities.length) { const p=document.createElement("p"); p.className="muted"; p.textContent=archivedActivityCount?"All recent activity records are archived from this view.":"No focused training activities completed yet."; els.activityHistory.appendChild(p); }
    else for (const record of (activityExpanded?visibleActivities:visibleActivities.slice(0,CAREER_HISTORY_PREVIEW_LIMIT))) { const def=registries.activities.get(record.activityDefinitionId), shell=document.createElement("div");shell.className="history-row-shell"; const item=document.createElement("button"); item.type="button"; item.className="activity-item training-record activity-log-button"; const time=document.createElement("time"); time.textContent=record.endDate; const text=document.createElement("span"); const outcome=record.qualificationResult?`${record.qualificationResult.label.toUpperCase()} ${record.qualificationResult.score}/${record.qualificationResult.maxScore}`:`${(record.performanceRating ?? "completed").toUpperCase()}${record.performanceScore!=null?` ${record.performanceScore}/100`:""}`; text.textContent=`${def.name} · ${outcome} · ${record.durationDays} day${record.durationDays===1?"":"s"}${record.eventRecordId?" · event":""}`; item.append(time,text); item.addEventListener("click",()=>onShowActivity(record.id)); const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecord("activity-history",personId,record.id));shell.append(item,archive);els.activityHistory.appendChild(shell); }
    const activityControls=createHistoryControls({kind:"activity-history",personId,hiddenCount:Math.max(0,visibleActivities.length-CAREER_HISTORY_PREVIEW_LIMIT),archivedCount:archivedActivityCount,expanded:activityExpanded,onToggle:()=>{els.activityHistory.dataset.expanded=activityExpanded?"false":"true";onRender();}}); if(activityControls.childElementCount)els.activityHistory.appendChild(activityControls);
  }

  function renderSchoolCatalog(state,indexes,personId){
    if(!els.schoolCatalog)return; const catalog=selectSchoolCatalog(state,indexes,registries,personId); els.schoolCatalog.replaceChildren();
    for(const item of catalog){
      const card=document.createElement("article");card.className=`school-catalog-card ${item.eligible?"eligible":"locked"}`;
      const head=document.createElement("div");head.className="school-catalog-head";const title=document.createElement("strong");title.textContent=item.name;const status=document.createElement("span");status.className="school-catalog-status";status.textContent=item.completed?"COMPLETED":item.activeStatus?item.activeStatus.toUpperCase():item.eligible?"AVAILABLE":"LOCKED";head.append(title,status);card.appendChild(head);
      const meta=document.createElement("p");meta.className="muted compact-intro";meta.textContent=`${item.durationDays} days · ${String(item.schoolType).replaceAll("_"," ")}`;card.appendChild(meta);
      if(item.activeSource){const source=document.createElement("p");source.className="school-source";source.textContent=`Opportunity source: ${item.activeSource}`;card.appendChild(source);}
      if(item.completedDate){const done=document.createElement("p");done.className="school-source";done.textContent=`Completed ${item.completedDate}`;card.appendChild(done);}
      if(!item.eligible&&!item.completed){const reasons=document.createElement("ul");reasons.className="school-requirements";for(const reason of item.reasons){const li=document.createElement("li");li.textContent=reason;reasons.appendChild(li);}card.appendChild(reasons);}
      if(item.requestable){const button=document.createElement("button");button.type="button";button.className="compact-button";button.textContent="Request Volunteer Slot";button.addEventListener("click",()=>onRequestSchool(item.id));card.appendChild(button);}
      els.schoolCatalog.appendChild(card);
    }
  }

  return { renderGameplay, renderSchoolCatalog };
}
