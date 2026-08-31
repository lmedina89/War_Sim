export const roleDefinitions = [
  { id: "role_company_commander", schemaVersion: 2, name: "Company Commander", category: "command", authorityIds:["authority_schedule_unit_training","authority_manage_unit_personnel"] },
  { id: "role_executive_officer", schemaVersion: 2, name: "Executive Officer", category: "command", authorityIds:["authority_schedule_unit_training"] },
  { id: "role_first_sergeant", schemaVersion: 2, name: "First Sergeant", category: "senior_enlisted", authorityIds:["authority_manage_unit_personnel"] },
  { id: "role_company_clerk", schemaVersion: 1, name: "Company Operations Specialist", category: "support" },
  { id: "role_platoon_leader", schemaVersion: 2, name: "Platoon Leader", category: "command", authorityIds:["authority_schedule_unit_training"] },
  { id: "role_platoon_sergeant", schemaVersion: 2, name: "Platoon Sergeant", category: "senior_enlisted", authorityIds:["authority_manage_unit_personnel"] },
  { id: "role_squad_leader", schemaVersion: 2, name: "Squad Leader", category: "combat_leadership", authorityIds:["authority_schedule_unit_training"] },
  { id: "role_team_leader", schemaVersion: 2, name: "Team Leader", category: "combat_leadership", authorityIds:["authority_lead_team_activity"] },
  { id: "role_rifleman", schemaVersion: 1, name: "Rifleman", category: "infantry" },
  { id: "role_automatic_rifleman", schemaVersion: 1, name: "Automatic Rifleman", category: "infantry" },
  { id: "role_grenadier", schemaVersion: 1, name: "Grenadier", category: "infantry" }
];
