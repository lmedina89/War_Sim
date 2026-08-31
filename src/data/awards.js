export const awardDefinitions = [
  {
    id:"award_army_service_ribbon",schemaVersion:3,name:"Army Service Ribbon",shortName:"Army Service Ribbon",category:"ribbon",awardGroup:"service_award",permanent:true,repeatable:false,prestigeValue:2,precedence:900,
    eligibilitySource:"initial_entry_training_completion",eligibilityDescription:"Awarded after successful completion of initial entry training.",dd214Label:"Army Service Ribbon",
    display:{kind:"ribbon",iconId:"ribbon_army_service",uniformLocation:"ribbon_rack",ribbonPattern:["#1f4e79","#ffd34e","#d71920","#ffd34e","#1f4e79"]}
  },
  {
    id:"award_nco_professional_development_ribbon",schemaVersion:3,name:"NCO Professional Development Ribbon",shortName:"NCOPDR",category:"ribbon",awardGroup:"professional_development",permanent:true,repeatable:true,prestigeValue:4,precedence:710,
    eligibilitySource:"professional_military_education",eligibilityDescription:"Awarded for completion of qualifying NCO professional military education.",dd214Label:"NCO Professional Development Ribbon",
    repeatDevice:{type:"numeral",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_ncopd",uniformLocation:"ribbon_rack",ribbonPattern:["#2d6b3f","#f2cb05","#2d6b3f","#f2cb05","#2d6b3f"]}
  },
  {
    id:"award_army_good_conduct_medal",schemaVersion:3,name:"Army Good Conduct Medal",shortName:"AGCM",category:"medal",awardGroup:"service_award",permanent:true,repeatable:true,prestigeValue:5,precedence:560,
    eligibilitySource:"qualifying_enlisted_service",eligibilityDescription:"Awarded by the simulation after each three-year block of qualifying active enlisted service.",dd214Label:"Army Good Conduct Medal",
    repeatDevice:{type:"knot",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_good_conduct",uniformLocation:"ribbon_rack",ribbonPattern:["#a71930","#ffffff","#a71930","#ffffff","#a71930"]}
  },
  {
    id:"award_army_achievement_medal",schemaVersion:3,name:"Army Achievement Medal",shortName:"AAM",category:"medal",awardGroup:"commendation",permanent:true,repeatable:true,prestigeValue:6,precedence:330,
    eligibilitySource:"meritorious_achievement",eligibilityDescription:"May be awarded for sustained excellent performance or a significant achievement below the level normally recognized by the Army Commendation Medal.",dd214Label:"Army Achievement Medal",
    repeatDevice:{type:"oak_leaf_cluster",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_aam",uniformLocation:"ribbon_rack",ribbonPattern:["#1f4e79","#ffffff","#1f4e79","#ffffff","#1f4e79"]}
  },
  {
    id:"award_army_commendation_medal",schemaVersion:3,name:"Army Commendation Medal",shortName:"ARCOM",category:"medal",awardGroup:"commendation",permanent:true,repeatable:true,prestigeValue:10,precedence:300,
    eligibilitySource:"meritorious_service",eligibilityDescription:"May be awarded for sustained superior performance or significant meritorious service.",dd214Label:"Army Commendation Medal",
    repeatDevice:{type:"oak_leaf_cluster",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_arcom",uniformLocation:"ribbon_rack",ribbonPattern:["#2f6b3e","#ffffff","#2f6b3e","#ffffff","#2f6b3e"]}
  },
  {
    id:"award_meritorious_service_medal",schemaVersion:3,name:"Meritorious Service Medal",shortName:"MSM",category:"medal",awardGroup:"commendation",permanent:true,repeatable:true,prestigeValue:16,precedence:250,
    eligibilitySource:"exceptional_meritorious_service",eligibilityDescription:"Reserved for exceptionally meritorious non-combat service at higher responsibility levels.",dd214Label:"Meritorious Service Medal",
    repeatDevice:{type:"oak_leaf_cluster",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_msm",uniformLocation:"ribbon_rack",ribbonPattern:["#8b1538","#ffffff","#8b1538","#ffffff","#8b1538"]}
  },
  {
    id:"award_national_defense_service_medal",schemaVersion:3,name:"National Defense Service Medal",shortName:"NDSM",category:"medal",awardGroup:"service_award",permanent:true,repeatable:false,prestigeValue:3,precedence:610,
    eligibilitySource:"designated_service_period",eligibilityDescription:"Award pathway is reserved for qualifying service during a designated national-emergency period.",dd214Label:"National Defense Service Medal",
    display:{kind:"ribbon",iconId:"ribbon_ndsm",uniformLocation:"ribbon_rack",ribbonPattern:["#d71920","#ffffff","#1f4e79","#ffd34e","#1f4e79","#ffffff","#d71920"]}
  },
  {
    id:"award_global_war_on_terrorism_service_medal",schemaVersion:3,name:"Global War on Terrorism Service Medal",shortName:"GWOTSM",category:"medal",awardGroup:"service_award",permanent:true,repeatable:false,prestigeValue:4,precedence:660,
    eligibilitySource:"designated_operation_support",eligibilityDescription:"Award pathway is reserved for qualifying support of a designated operation.",dd214Label:"Global War on Terrorism Service Medal",
    display:{kind:"ribbon",iconId:"ribbon_gwotsm",uniformLocation:"ribbon_rack",ribbonPattern:["#1f4e79","#ffd34e","#ffffff","#87b5df","#ffffff","#ffd34e","#1f4e79"]}
  },
  {
    id:"award_overseas_service_ribbon",schemaVersion:3,name:"Army Overseas Service Ribbon",shortName:"OSR",category:"ribbon",awardGroup:"service_award",permanent:true,repeatable:true,prestigeValue:4,precedence:740,
    eligibilitySource:"overseas_tour_completion",eligibilityDescription:"Awarded for completion of a qualifying overseas tour when deployment and overseas-tour systems support the requirement.",dd214Label:"Army Overseas Service Ribbon",
    repeatDevice:{type:"numeral",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_osr",uniformLocation:"ribbon_rack",ribbonPattern:["#1f4e79","#ffffff","#d71920","#ffffff","#1f4e79"]}
  },
  {
    id:"award_campaign_01",schemaVersion:3,name:"Campaign Service Ribbon",shortName:"Campaign Ribbon",category:"ribbon",awardGroup:"campaign",permanent:true,repeatable:true,prestigeValue:8,precedence:640,
    eligibilitySource:"campaign_participation",eligibilityDescription:"Awarded for qualifying participation in a designated campaign.",dd214Label:"Campaign Service Ribbon",
    repeatDevice:{type:"service_star",startsAt:2},display:{kind:"ribbon",iconId:"ribbon_campaign",uniformLocation:"ribbon_rack",ribbonPattern:["#8b1538","#d6b56f","#1f4e79","#d6b56f","#8b1538"]}
  },
  {
    id:"award_combat_badge",schemaVersion:3,name:"Combat Infantryman Badge",shortName:"CIB",category:"badge",awardGroup:"combat_special_skill",permanent:true,repeatable:false,prestigeValue:15,precedence:120,
    eligibilitySource:"qualifying_infantry_combat",eligibilityDescription:"Requires qualifying infantry service while personally present and participating in eligible ground combat.",dd214Label:"Combat Infantryman Badge",
    display:{kind:"badge",iconId:"badge_combat_infantry",uniformLocation:"upper_left_chest",badgeFamily:"rifle_wreath"}
  },
  {
    id:"award_expert_infantryman_badge",schemaVersion:3,name:"Expert Infantryman Badge",shortName:"EIB",category:"badge",awardGroup:"combat_special_skill",permanent:true,repeatable:false,prestigeValue:10,precedence:130,
    eligibilitySource:"expert_infantry_testing",eligibilityDescription:"Requires successful completion of a future Expert Infantryman Badge testing pipeline.",dd214Label:"Expert Infantryman Badge",
    display:{kind:"badge",iconId:"badge_expert_infantry",uniformLocation:"upper_left_chest",badgeFamily:"rifle_wreath"}
  },
  {
    id:"award_parachutist_badge",schemaVersion:3,name:"Parachutist Badge",shortName:"Parachutist",category:"badge",awardGroup:"special_skill",permanent:true,repeatable:false,prestigeValue:6,precedence:170,
    eligibilitySource:"school_airborne",eligibilityDescription:"Awarded on successful completion of Airborne School.",dd214Label:"Parachutist Badge",
    display:{kind:"badge",iconId:"badge_parachutist_basic",uniformLocation:"upper_left_chest",badgeFamily:"aviation_wings"}
  },
  {
    id:"award_air_assault_badge",schemaVersion:3,name:"Air Assault Badge",shortName:"Air Assault",category:"badge",awardGroup:"special_skill",permanent:true,repeatable:false,prestigeValue:7,precedence:180,
    eligibilitySource:"school_air_assault",eligibilityDescription:"Reserved for a future Air Assault School completion pathway.",dd214Label:"Air Assault Badge",
    display:{kind:"badge",iconId:"badge_air_assault",uniformLocation:"upper_left_chest",badgeFamily:"aviation_wings"}
  },
  {
    id:"award_ranger_tab",schemaVersion:3,name:"Ranger Tab",shortName:"RANGER",category:"tab",awardGroup:"special_skill",permanent:true,repeatable:false,prestigeValue:14,precedence:80,
    eligibilitySource:"school_ranger",eligibilityDescription:"Reserved for successful completion of a future Ranger Course pipeline.",dd214Label:"Ranger Tab",
    display:{kind:"tab",iconId:"tab_ranger",uniformLocation:"left_shoulder_tab",text:"RANGER"}
  },
  {
    id:"award_basic_training",schemaVersion:3,name:"Army Service Ribbon (Legacy)",shortName:"ASR Legacy",category:"ribbon",awardGroup:"legacy",permanent:true,repeatable:false,prestigeValue:2,precedence:9999,legacy:true,
    dd214Label:"Army Service Ribbon",display:{kind:"ribbon",iconId:"ribbon_army_service",uniformLocation:"ribbon_rack",ribbonPattern:["#1f4e79","#ffd34e","#d71920","#ffd34e","#1f4e79"]}
  }
];
