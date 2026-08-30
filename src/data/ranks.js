export const rankDefinitions = [
  {
    id: "rank_army_e1", schemaVersion: 1, branchId: "branch_army", name: "Private", abbreviation: "PVT",
    payGrade: "E1", hierarchyLevel: 1, category: "enlisted",
    promotionRequirements: { minimumExperience: 100, minimumTimeInServiceDays: 30, minimumTimeInGradeDays: 30, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e2", schemaVersion: 1, branchId: "branch_army", name: "Private Second Class", abbreviation: "PV2",
    payGrade: "E2", hierarchyLevel: 2, category: "enlisted",
    promotionRequirements: { minimumExperience: 300, minimumTimeInServiceDays: 180, minimumTimeInGradeDays: 90, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e3", schemaVersion: 1, branchId: "branch_army", name: "Private First Class", abbreviation: "PFC",
    payGrade: "E3", hierarchyLevel: 3, category: "enlisted",
    promotionRequirements: { minimumExperience: 700, minimumTimeInServiceDays: 365, minimumTimeInGradeDays: 180, requiredQualificationIds: [] }
  },
  {
    id: "rank_army_e4", schemaVersion: 1, branchId: "branch_army", name: "Specialist", abbreviation: "SPC",
    payGrade: "E4", hierarchyLevel: 4, category: "enlisted",
    promotionRequirements: { minimumExperience: 1500, minimumTimeInServiceDays: 730, minimumTimeInGradeDays: 365, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e5", schemaVersion: 1, branchId: "branch_army", name: "Sergeant", abbreviation: "SGT",
    payGrade: "E5", hierarchyLevel: 5, category: "enlisted",
    promotionRequirements: { minimumExperience: 3000, minimumTimeInServiceDays: 1460, minimumTimeInGradeDays: 365, requiredQualificationIds: ["qualification_basic_leader"] }
  },
  {
    id: "rank_army_e6", schemaVersion: 1, branchId: "branch_army", name: "Staff Sergeant", abbreviation: "SSG",
    payGrade: "E6", hierarchyLevel: 6, category: "enlisted",
    promotionRequirements: null
  }
];
