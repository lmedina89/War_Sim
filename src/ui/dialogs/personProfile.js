export function createPersonProfileController({
  els,
  getProfileContext,
  createProfileUniform,
  createRankInsignia,
  statLine,
  progressRow,
  statusStamp,
  metricBlock,
  recordReference,
  readUiArchive,
  writeUiArchive,
  onOpenUnit,
  win = globalThis.window,
  raf = globalThis.requestAnimationFrame
}) {
  let activityExpanded = false;

  function close() { els.personDialog.close(); }

  function open(personId) {
    const context = getProfileContext(personId);
    if (!context) return;
    const { state, indexes, person, rank, billetDef, unit, branch, specialty, assignment, career, primary, equipment, gameplay } = context;

    els.personProfileAuthority.textContent = `${branch?.name?.toUpperCase() ?? "SERVICE"} PERSONNEL COMMAND`;
    els.personProfileRef.textContent = recordReference("personnel_file", personId);
    els.personProfileName.textContent = `${rank.abbreviation} ${person.identity.displayName}${personId === state.playerPersonId ? " · YOU" : ""}`;

    els.personDogTag.replaceChildren();
    els.personDogTag.classList.add("has-rank-insignia");
    const dogRank = document.createElement("div");
    dogRank.className = "dog-tag-rank-insignia";
    dogRank.setAttribute("aria-label", `${rank.name} rank insignia`);
    dogRank.append(createRankInsignia(rank));
    els.personDogTag.appendChild(dogRank);

    const formationName = assignment.chain[0]?.formationName ?? assignment.chain[0]?.name ?? "—";
    for (const [label, value] of [
      ["NAME", person.identity.displayName.toUpperCase()],
      ["SERVICE", branch?.name ?? "—"],
      ["GRADE", `${rank.abbreviation} / ${rank.payGrade}`],
      ["MOS", specialty ? `${specialty.code} ${specialty.name}` : "—"],
      ["FORMATION", formationName],
      ["UNIT", unit?.name ?? "Unassigned"]
    ]) {
      const row = document.createElement("div");
      row.className = "dog-tag-row";
      const key = document.createElement("span"), val = document.createElement("strong");
      key.textContent = label;
      val.textContent = value;
      row.append(key, val);
      els.personDogTag.appendChild(row);
    }

    els.personProfileBreadcrumbs.replaceChildren(...assignment.chain.map(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "profile-breadcrumb";
      button.textContent = item.name;
      button.addEventListener("click", () => onOpenUnit(item.unitId));
      return button;
    }));

    const status = document.createElement("div");
    status.className = "profile-status-strip";
    status.append(
      statusStamp(person.condition.status),
      metricBlock("READY", `${person.condition.readiness}%`),
      metricBlock("MORALE", `${person.condition.morale}%`),
      metricBlock("HEALTH", `${person.condition.health}%`)
    );

    const tierOneUniform = personId !== state.playerPersonId && person.simulationTier === 1
      ? createProfileUniform(state, indexes, personId)
      : null;
    if (tierOneUniform) {
      const uniformAction = document.createElement("button");
      uniformAction.type = "button";
      uniformAction.className = "secondary profile-uniform-button";
      uniformAction.textContent = "View Uniform";
      uniformAction.addEventListener("click", () => {
        tierOneUniform.hidden = !tierOneUniform.hidden;
        uniformAction.textContent = tierOneUniform.hidden ? "View Uniform" : "Hide Uniform";
        if (!tierOneUniform.hidden && typeof raf === "function") raf(() => {
          const top = Math.max(0, win.scrollY + tierOneUniform.getBoundingClientRect().top - 20);
          win.scrollTo({ top, behavior: "smooth" });
        });
      });
      status.appendChild(uniformAction);
    }

    const assignmentSection = document.createElement("section");
    assignmentSection.className = "profile-section service-file-section";
    const assignmentTitle = document.createElement("h3");
    assignmentTitle.textContent = "Assignment";
    const openUnit = document.createElement("button");
    openUnit.type = "button";
    openUnit.className = "secondary compact-button profile-unit-link";
    openUnit.textContent = "Open Unit";
    openUnit.addEventListener("click", () => onOpenUnit(person.affiliation.unitId));
    assignmentSection.append(
      assignmentTitle,
      statLine("Duty Position", billetDef?.name ?? "Unassigned"),
      statLine("Formation", formationName),
      statLine("Unit", unit?.name ?? "Unassigned"),
      openUnit
    );

    const conditionSection = document.createElement("section");
    conditionSection.className = "profile-section service-file-section";
    const conditionTitle = document.createElement("h3");
    conditionTitle.textContent = "Condition";
    conditionSection.append(
      conditionTitle,
      statLine("Fatigue", `${person.condition.fatigue}%`),
      statLine("Experience", person.career.experience),
      statLine("Prestige", person.career.prestige)
    );

    const equipmentSection = document.createElement("section");
    equipmentSection.className = "profile-section service-file-section";
    const equipmentTitle = document.createElement("h3");
    equipmentTitle.textContent = "Assigned Equipment";
    equipmentSection.append(
      equipmentTitle,
      statLine("Primary", equipment?.name ?? "Unassigned"),
      statLine("Condition", primary?.condition != null ? `${primary.condition}%` : "—")
    );

    const skillsSection = document.createElement("section");
    skillsSection.className = "profile-section service-file-section";
    const skillsTitle = document.createElement("h3");
    skillsTitle.textContent = "Proficiency";
    skillsSection.appendChild(skillsTitle);
    for (const skill of gameplay?.skills ?? []) skillsSection.appendChild(progressRow(skill.name, skill.value, 100));

    const recordSection = document.createElement("section");
    recordSection.className = "profile-section service-file-section";
    const recordTitle = document.createElement("h3");
    recordTitle.textContent = "Education, Qualifications & Awards";
    recordSection.appendChild(recordTitle);
    if (!career.education.length && !career.qualifications.length && !career.awards.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state military-empty";
      empty.textContent = "NO MILITARY EDUCATION, QUALIFICATIONS, OR AWARDS RECORDED";
      recordSection.appendChild(empty);
    } else {
      const usedQualifications = new Set(), usedAwards = new Set();
      for (const education of career.education) {
        const cluster = document.createElement("div");
        cluster.className = "achievement-cluster";
        cluster.appendChild(statLine(education.name, `GRADUATED · ${education.completedDate ?? "—"}`));
        for (const qualification of career.qualifications.filter(item => item.schoolId === education.schoolId)) {
          usedQualifications.add(qualification.id);
          const detail = [qualification.result?.toUpperCase(), qualification.score != null && qualification.maxScore != null ? `${qualification.score}/${qualification.maxScore}` : null, qualification.expiresDate ? `EXP ${qualification.expiresDate}` : null].filter(Boolean).join(" · ");
          const line = statLine(`↳ ${qualification.name}`, detail || qualification.completedDate);
          line.classList.add("achievement-child");
          cluster.appendChild(line);
        }
        for (const award of career.awards.filter(item => item.sourceId === education.id || context.getAwardDefinition(item.awardId)?.eligibilitySource === education.schoolId)) {
          usedAwards.add(award.id);
          const line = statLine(`↳ ${award.name}`, award.earnedDate);
          line.classList.add("achievement-child");
          cluster.appendChild(line);
          if (award.reason) {
            const reason = document.createElement("p");
            reason.className = "muted award-provenance achievement-child";
            reason.textContent = `Why earned: ${award.reason}`;
            cluster.appendChild(reason);
          }
        }
        recordSection.appendChild(cluster);
      }
      for (const qualification of career.qualifications.filter(item => !usedQualifications.has(item.id))) {
        const detail = [qualification.result?.toUpperCase(), qualification.score != null && qualification.maxScore != null ? `${qualification.score}/${qualification.maxScore}` : null, qualification.expiresDate ? `EXP ${qualification.expiresDate}` : null].filter(Boolean).join(" · ");
        recordSection.appendChild(statLine(qualification.name, detail || qualification.completedDate));
      }
      for (const award of career.awards.filter(item => !usedAwards.has(item.id))) {
        const cluster = document.createElement("div");
        cluster.className = "achievement-cluster";
        cluster.appendChild(statLine(award.name, award.earnedDate));
        if (award.reason) {
          const reason = document.createElement("p");
          reason.className = "muted award-provenance";
          reason.textContent = `Why earned: ${award.reason}`;
          cluster.appendChild(reason);
        }
        recordSection.appendChild(cluster);
      }
    }

    const activitySection = document.createElement("section");
    activitySection.className = "profile-section service-file-section";
    const activityTitle = document.createElement("h3");
    activityTitle.textContent = "Recent Career Activity";
    activitySection.appendChild(activityTitle);
    const archiveKey = `${personId}`;
    const archive = readUiArchive("person-career-activity", archiveKey);
    const visible = (gameplay?.recentCareerActivity ?? []).filter(item => !archive.has(item.id));
    const shown = activityExpanded ? visible : visible.slice(0, 4);
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state compact-empty";
      empty.textContent = archive.size ? "RECENT CAREER ACTIVITY ARCHIVED FROM THIS VIEW" : "NO RECENT CAREER ACTIVITY";
      activitySection.appendChild(empty);
    } else {
      for (const item of shown) {
        const shell = document.createElement("div");
        shell.className = "history-row-shell";
        shell.appendChild(statLine(item.date, item.title));
        const archiveButton = document.createElement("button");
        archiveButton.type = "button";
        archiveButton.className = "secondary compact-button history-archive";
        archiveButton.textContent = "Archive";
        archiveButton.addEventListener("click", () => {
          const values = readUiArchive("person-career-activity", archiveKey);
          values.add(item.id);
          writeUiArchive("person-career-activity", archiveKey, values);
          open(personId);
        });
        shell.appendChild(archiveButton);
        activitySection.appendChild(shell);
      }
    }
    const profileActions = document.createElement("div");
    profileActions.className = "history-actions";
    if (visible.length > 4) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "secondary compact-button";
      toggle.textContent = activityExpanded ? "Recent Only" : "Show More";
      toggle.addEventListener("click", () => { activityExpanded = !activityExpanded; open(personId); });
      profileActions.appendChild(toggle);
    }
    if (archive.size) {
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "secondary compact-button";
      restore.textContent = `Restore Archived (${archive.size})`;
      restore.addEventListener("click", () => { writeUiArchive("person-career-activity", archiveKey, new Set()); open(personId); });
      profileActions.appendChild(restore);
    }
    activitySection.appendChild(profileActions);
    activitySection.appendChild(statLine("Simulation Detail", gameplay?.simulationTierLabel ?? "Background Simulation"));
    if (gameplay?.simulationTierDescription) {
      const simNote = document.createElement("p");
      simNote.className = "simulation-detail-note";
      simNote.textContent = gameplay.simulationTierDescription;
      activitySection.appendChild(simNote);
    }

    els.personProfileBody.replaceChildren(status, ...(tierOneUniform ? [tierOneUniform] : []), assignmentSection, conditionSection, equipmentSection, skillsSection, recordSection, activitySection);
    els.personDialog.showModal();
  }

  return { open, close };
}
