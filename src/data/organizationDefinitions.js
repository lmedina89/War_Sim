export const organizationDefinitions = [
  { id:"orgdef_infantry_company",schemaVersion:2,name:"Infantry Company",echelonId:"echelon_company",branchId:"branch_army",billetDefinitionIds:["billet_company_commander","billet_executive_officer","billet_first_sergeant","billet_company_clerk"],childOrganizationDefinitionIds:["orgdef_infantry_platoon"] },
  { id:"orgdef_infantry_platoon",schemaVersion:2,name:"Infantry Platoon",echelonId:"echelon_platoon",branchId:"branch_army",billetDefinitionIds:["billet_platoon_leader","billet_platoon_sergeant"],childOrganizationDefinitionIds:["orgdef_infantry_squad"] },
  { id:"orgdef_infantry_squad",schemaVersion:2,name:"Infantry Squad",echelonId:"echelon_squad",branchId:"branch_army",billetDefinitionIds:["billet_squad_leader","billet_team_leader","billet_grenadier","billet_automatic_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman"] }
];
