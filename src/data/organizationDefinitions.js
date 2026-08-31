export const organizationDefinitions = [
  { id:"orgdef_infantry_division",schemaVersion:1,name:"Infantry Division",echelonId:"echelon_division",branchId:"branch_army",billetDefinitionIds:[],childOrganizationDefinitionIds:["orgdef_infantry_brigade"] },
  { id:"orgdef_infantry_brigade",schemaVersion:1,name:"Infantry Brigade",echelonId:"echelon_brigade",branchId:"branch_army",billetDefinitionIds:[],childOrganizationDefinitionIds:["orgdef_infantry_battalion","orgdef_infantry_company"] },
  { id:"orgdef_infantry_battalion",schemaVersion:1,name:"Infantry Battalion",echelonId:"echelon_battalion",branchId:"branch_army",billetDefinitionIds:[],childOrganizationDefinitionIds:["orgdef_infantry_company"] },
  { id:"orgdef_infantry_company",schemaVersion:2,name:"Infantry Company",echelonId:"echelon_company",branchId:"branch_army",billetDefinitionIds:["billet_company_commander","billet_executive_officer","billet_first_sergeant","billet_company_clerk"],childOrganizationDefinitionIds:["orgdef_infantry_platoon"] },
  { id:"orgdef_infantry_platoon",schemaVersion:2,name:"Infantry Platoon",echelonId:"echelon_platoon",branchId:"branch_army",billetDefinitionIds:["billet_platoon_leader","billet_platoon_sergeant"],childOrganizationDefinitionIds:["orgdef_infantry_squad"] },
  { id:"orgdef_infantry_squad",schemaVersion:2,name:"Infantry Squad",echelonId:"echelon_squad",branchId:"branch_army",billetDefinitionIds:["billet_squad_leader","billet_team_leader","billet_grenadier","billet_automatic_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman"] }
];
