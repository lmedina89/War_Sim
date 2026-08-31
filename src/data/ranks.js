export const rankDefinitions = [
  {
    id: "rank_army_e1", schemaVersion: 2, branchId: "branch_army", name: "Private", abbreviation: "PVT",
    payGrade: "E1", hierarchyLevel: 1, category: "enlisted", promotionTargetRankId: "rank_army_e2",
    promotionRequirements: { minimumExperience: 100, minimumTimeInServiceDays: 30, minimumTimeInGradeDays: 30, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e2", schemaVersion: 2, branchId: "branch_army", name: "Private Second Class", abbreviation: "PV2",
    payGrade: "E2", hierarchyLevel: 2, category: "enlisted", promotionTargetRankId: "rank_army_e3",
    promotionRequirements: { minimumExperience: 300, minimumTimeInServiceDays: 180, minimumTimeInGradeDays: 90, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e3", schemaVersion: 2, branchId: "branch_army", name: "Private First Class", abbreviation: "PFC",
    payGrade: "E3", hierarchyLevel: 3, category: "enlisted", promotionTargetRankId: "rank_army_e4",
    promotionRequirements: { minimumExperience: 700, minimumTimeInServiceDays: 365, minimumTimeInGradeDays: 180, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e4", schemaVersion: 2, branchId: "branch_army", name: "Specialist", abbreviation: "SPC",
    payGrade: "E4", hierarchyLevel: 4, category: "enlisted", promotionTargetRankId: "rank_army_e5",
    promotionRequirements: { minimumExperience: 1500, minimumTimeInServiceDays: 730, minimumTimeInGradeDays: 365, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e5", schemaVersion: 2, branchId: "branch_army", name: "Sergeant", abbreviation: "SGT",
    payGrade: "E5", hierarchyLevel: 5, category: "enlisted", promotionTargetRankId: "rank_army_e6",
    promotionRequirements: { minimumExperience: 3000, minimumTimeInServiceDays: 1460, minimumTimeInGradeDays: 365, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e6", schemaVersion: 2, branchId: "branch_army", name: "Staff Sergeant", abbreviation: "SSG",
    payGrade: "E6", hierarchyLevel: 6, category: "enlisted", promotionTargetRankId: "rank_army_e7",
    promotionRequirements: { minimumExperience: 5000, minimumTimeInServiceDays: 2190, minimumTimeInGradeDays: 730, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e7", schemaVersion: 2, branchId: "branch_army", name: "Sergeant First Class", abbreviation: "SFC",
    payGrade: "E7", hierarchyLevel: 7, category: "enlisted", promotionTargetRankId: "rank_army_e8_msg",
    promotionRequirements: { minimumExperience: 8000, minimumTimeInServiceDays: 3650, minimumTimeInGradeDays: 1095, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e8_msg", schemaVersion: 2, branchId: "branch_army", name: "Master Sergeant", abbreviation: "MSG",
    payGrade: "E8", hierarchyLevel: 8, category: "enlisted", promotionTargetRankId: null,
    promotionRequirements: null, terminalReason: "Senior enlisted progression beyond E-8 is not implemented in this build."
  },
  {
    id: "rank_army_e8", schemaVersion: 2, branchId: "branch_army", name: "First Sergeant", abbreviation: "1SG",
    payGrade: "E8", hierarchyLevel: 8, category: "enlisted", positional: true, promotionTargetRankId: null,
    promotionRequirements: null, terminalReason: "First Sergeant is represented as an E-8 leadership position, not the automatic promotion after SFC."
  },
  {
    id: "rank_army_o1", schemaVersion: 2, branchId: "branch_army", name: "Second Lieutenant", abbreviation: "2LT",
    payGrade: "O1", hierarchyLevel: 7, category: "officer", promotionTargetRankId: "rank_army_o2",
    promotionRequirements: { minimumExperience: 1200, minimumTimeInServiceDays: 548, minimumTimeInGradeDays: 548, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_o2", schemaVersion: 2, branchId: "branch_army", name: "First Lieutenant", abbreviation: "1LT",
    payGrade: "O2", hierarchyLevel: 8, category: "officer", promotionTargetRankId: "rank_army_o3",
    promotionRequirements: { minimumExperience: 2600, minimumTimeInServiceDays: 1278, minimumTimeInGradeDays: 730, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_o3", schemaVersion: 2, branchId: "branch_army", name: "Captain", abbreviation: "CPT",
    payGrade: "O3", hierarchyLevel: 9, category: "officer", promotionTargetRankId: null,
    promotionRequirements: null, terminalReason: "Officer progression beyond Captain is not implemented in this build."
  }
];
