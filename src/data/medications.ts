// Static list of women's health medications
// These are shown in the medication picker and searched via the combined research endpoint

export interface Medication {
  id: number;
  name: string;
  genericName: string;
  drugClass: string;
  indication: string;
  fdaApproved: boolean;
}

export const MEDICATIONS: Medication[] = [
  // Diabetes medications (with women's health considerations)
  { id: 1, name: "Metformin", genericName: "metformin hydrochloride", drugClass: "Biguanide", indication: "Type 2 Diabetes, PCOS", fdaApproved: true },
  { id: 2, name: "Semaglutide", genericName: "semaglutide", drugClass: "GLP-1 Receptor Agonist", indication: "Type 2 Diabetes, Obesity", fdaApproved: true },
  { id: 3, name: "Ozempic", genericName: "semaglutide", drugClass: "GLP-1 Receptor Agonist", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 4, name: "Wegovy", genericName: "semaglutide", drugClass: "GLP-1 Receptor Agonist", indication: "Weight Management", fdaApproved: true },
  { id: 5, name: "Mounjaro", genericName: "tirzepatide", drugClass: "GIP/GLP-1 Receptor Agonist", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 6, name: "Jardiance", genericName: "empagliflozin", drugClass: "SGLT2 Inhibitor", indication: "Type 2 Diabetes, Heart Failure", fdaApproved: true },
  { id: 7, name: "Farxiga", genericName: "dapagliflozin", drugClass: "SGLT2 Inhibitor", indication: "Type 2 Diabetes, Heart Failure", fdaApproved: true },
  { id: 8, name: "Invokana", genericName: "canagliflozin", drugClass: "SGLT2 Inhibitor", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 9, name: "Trulicity", genericName: "dulaglutide", drugClass: "GLP-1 Receptor Agonist", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 10, name: "Victoza", genericName: "liraglutide", drugClass: "GLP-1 Receptor Agonist", indication: "Type 2 Diabetes", fdaApproved: true },
  
  // Hormonal/Reproductive Health
  { id: 11, name: "Premarin", genericName: "conjugated estrogens", drugClass: "Estrogen", indication: "Menopause Symptoms, Osteoporosis Prevention", fdaApproved: true },
  { id: 12, name: "Estrace", genericName: "estradiol", drugClass: "Estrogen", indication: "Menopause Symptoms", fdaApproved: true },
  { id: 13, name: "Provera", genericName: "medroxyprogesterone acetate", drugClass: "Progestin", indication: "Amenorrhea, Abnormal Uterine Bleeding", fdaApproved: true },
  { id: 14, name: "Prometrium", genericName: "progesterone", drugClass: "Progestin", indication: "Hormone Replacement Therapy", fdaApproved: true },
  { id: 15, name: "Clomid", genericName: "clomiphene citrate", drugClass: "Selective Estrogen Receptor Modulator", indication: "Ovulatory Dysfunction, Infertility", fdaApproved: true },
  { id: 16, name: "Letrozole", genericName: "letrozole", drugClass: "Aromatase Inhibitor", indication: "Breast Cancer, Ovulation Induction", fdaApproved: true },
  { id: 17, name: "Yaz", genericName: "drospirenone/ethinyl estradiol", drugClass: "Combined Oral Contraceptive", indication: "Contraception, PMDD, Acne", fdaApproved: true },
  { id: 18, name: "Lo Loestrin Fe", genericName: "norethindrone/ethinyl estradiol", drugClass: "Combined Oral Contraceptive", indication: "Contraception", fdaApproved: true },
  { id: 19, name: "NuvaRing", genericName: "etonogestrel/ethinyl estradiol", drugClass: "Contraceptive Ring", indication: "Contraception", fdaApproved: true },
  { id: 20, name: "Mirena", genericName: "levonorgestrel", drugClass: "Intrauterine Device", indication: "Contraception, Heavy Menstrual Bleeding", fdaApproved: true },
  
  // Osteoporosis
  { id: 21, name: "Fosamax", genericName: "alendronate", drugClass: "Bisphosphonate", indication: "Osteoporosis", fdaApproved: true },
  { id: 22, name: "Boniva", genericName: "ibandronate", drugClass: "Bisphosphonate", indication: "Osteoporosis", fdaApproved: true },
  { id: 23, name: "Prolia", genericName: "denosumab", drugClass: "RANK Ligand Inhibitor", indication: "Osteoporosis", fdaApproved: true },
  { id: 24, name: "Evista", genericName: "raloxifene", drugClass: "Selective Estrogen Receptor Modulator", indication: "Osteoporosis, Breast Cancer Prevention", fdaApproved: true },
  { id: 25, name: "Forteo", genericName: "teriparatide", drugClass: "Parathyroid Hormone Analog", indication: "Osteoporosis", fdaApproved: true },
  
  // Breast Cancer
  { id: 26, name: "Tamoxifen", genericName: "tamoxifen citrate", drugClass: "Selective Estrogen Receptor Modulator", indication: "Breast Cancer", fdaApproved: true },
  { id: 27, name: "Arimidex", genericName: "anastrozole", drugClass: "Aromatase Inhibitor", indication: "Breast Cancer", fdaApproved: true },
  { id: 28, name: "Aromasin", genericName: "exemestane", drugClass: "Aromatase Inhibitor", indication: "Breast Cancer", fdaApproved: true },
  { id: 29, name: "Herceptin", genericName: "trastuzumab", drugClass: "Monoclonal Antibody", indication: "HER2+ Breast Cancer", fdaApproved: true },
  { id: 30, name: "Ibrance", genericName: "palbociclib", drugClass: "CDK4/6 Inhibitor", indication: "HR+/HER2- Breast Cancer", fdaApproved: true },
  
  // Thyroid
  { id: 31, name: "Synthroid", genericName: "levothyroxine", drugClass: "Thyroid Hormone", indication: "Hypothyroidism", fdaApproved: true },
  { id: 32, name: "Armour Thyroid", genericName: "thyroid desiccated", drugClass: "Thyroid Hormone", indication: "Hypothyroidism", fdaApproved: true },
  { id: 33, name: "Methimazole", genericName: "methimazole", drugClass: "Antithyroid Agent", indication: "Hyperthyroidism", fdaApproved: true },
  
  // Mental Health (higher prevalence in women)
  { id: 34, name: "Lexapro", genericName: "escitalopram", drugClass: "SSRI", indication: "Depression, Anxiety", fdaApproved: true },
  { id: 35, name: "Zoloft", genericName: "sertraline", drugClass: "SSRI", indication: "Depression, Anxiety, PMDD", fdaApproved: true },
  { id: 36, name: "Prozac", genericName: "fluoxetine", drugClass: "SSRI", indication: "Depression, OCD, Bulimia", fdaApproved: true },
  { id: 37, name: "Wellbutrin", genericName: "bupropion", drugClass: "NDRI", indication: "Depression, Smoking Cessation", fdaApproved: true },
  { id: 38, name: "Effexor", genericName: "venlafaxine", drugClass: "SNRI", indication: "Depression, Anxiety, Hot Flashes", fdaApproved: true },
  { id: 39, name: "Cymbalta", genericName: "duloxetine", drugClass: "SNRI", indication: "Depression, Fibromyalgia, Chronic Pain", fdaApproved: true },
  
  // Migraine (3x more common in women)
  { id: 40, name: "Imitrex", genericName: "sumatriptan", drugClass: "Triptan", indication: "Migraine", fdaApproved: true },
  { id: 41, name: "Aimovig", genericName: "erenumab", drugClass: "CGRP Inhibitor", indication: "Migraine Prevention", fdaApproved: true },
  { id: 42, name: "Ajovy", genericName: "fremanezumab", drugClass: "CGRP Inhibitor", indication: "Migraine Prevention", fdaApproved: true },
  { id: 43, name: "Emgality", genericName: "galcanezumab", drugClass: "CGRP Inhibitor", indication: "Migraine Prevention", fdaApproved: true },
  { id: 44, name: "Nurtec", genericName: "rimegepant", drugClass: "CGRP Receptor Antagonist", indication: "Migraine", fdaApproved: true },
  { id: 45, name: "Ubrelvy", genericName: "ubrogepant", drugClass: "CGRP Receptor Antagonist", indication: "Migraine", fdaApproved: true },
  
  // Autoimmune (higher prevalence in women)
  { id: 46, name: "Plaquenil", genericName: "hydroxychloroquine", drugClass: "DMARD", indication: "Lupus, Rheumatoid Arthritis", fdaApproved: true },
  { id: 47, name: "Humira", genericName: "adalimumab", drugClass: "TNF Inhibitor", indication: "Rheumatoid Arthritis, Crohn's Disease", fdaApproved: true },
  { id: 48, name: "Enbrel", genericName: "etanercept", drugClass: "TNF Inhibitor", indication: "Rheumatoid Arthritis, Psoriasis", fdaApproved: true },
  { id: 49, name: "Benlysta", genericName: "belimumab", drugClass: "B-Lymphocyte Stimulator Inhibitor", indication: "Lupus", fdaApproved: true },
  
  // UTI/Bladder (more common in women)
  { id: 50, name: "Macrobid", genericName: "nitrofurantoin", drugClass: "Antibiotic", indication: "Urinary Tract Infection", fdaApproved: true },
  { id: 51, name: "Bactrim", genericName: "sulfamethoxazole/trimethoprim", drugClass: "Antibiotic", indication: "Urinary Tract Infection", fdaApproved: true },
  { id: 52, name: "Myrbetriq", genericName: "mirabegron", drugClass: "Beta-3 Agonist", indication: "Overactive Bladder", fdaApproved: true },
  { id: 53, name: "Detrol", genericName: "tolterodine", drugClass: "Anticholinergic", indication: "Overactive Bladder", fdaApproved: true },
  
  // Endometriosis
  { id: 54, name: "Orilissa", genericName: "elagolix", drugClass: "GnRH Antagonist", indication: "Endometriosis Pain", fdaApproved: true },
  { id: 55, name: "Lupron", genericName: "leuprolide", drugClass: "GnRH Agonist", indication: "Endometriosis, Uterine Fibroids", fdaApproved: true },
  
  // Iron Deficiency (more common in women)
  { id: 56, name: "Feraheme", genericName: "ferumoxytol", drugClass: "Iron Supplement", indication: "Iron Deficiency Anemia", fdaApproved: true },
  { id: 57, name: "Injectafer", genericName: "ferric carboxymaltose", drugClass: "Iron Supplement", indication: "Iron Deficiency Anemia", fdaApproved: true },
  
  // Cardiovascular (often understudied in women)
  { id: 58, name: "Lipitor", genericName: "atorvastatin", drugClass: "Statin", indication: "High Cholesterol", fdaApproved: true },
  { id: 59, name: "Crestor", genericName: "rosuvastatin", drugClass: "Statin", indication: "High Cholesterol", fdaApproved: true },
  { id: 60, name: "Eliquis", genericName: "apixaban", drugClass: "Factor Xa Inhibitor", indication: "Atrial Fibrillation, DVT/PE", fdaApproved: true },
  { id: 61, name: "Xarelto", genericName: "rivaroxaban", drugClass: "Factor Xa Inhibitor", indication: "Atrial Fibrillation, DVT/PE", fdaApproved: true },
  { id: 62, name: "Entresto", genericName: "sacubitril/valsartan", drugClass: "ARNi", indication: "Heart Failure", fdaApproved: true },
  
  // Skin/Dermatology
  { id: 63, name: "Spironolactone", genericName: "spironolactone", drugClass: "Aldosterone Antagonist", indication: "Hormonal Acne, Hirsutism", fdaApproved: true },
  { id: 64, name: "Accutane", genericName: "isotretinoin", drugClass: "Retinoid", indication: "Severe Acne", fdaApproved: true },
  
  // Common medications with sex-specific considerations
  { id: 65, name: "Ambien", genericName: "zolpidem", drugClass: "Sedative-Hypnotic", indication: "Insomnia", fdaApproved: true },
  { id: 66, name: "Xanax", genericName: "alprazolam", drugClass: "Benzodiazepine", indication: "Anxiety, Panic Disorder", fdaApproved: true },
  { id: 67, name: "Gabapentin", genericName: "gabapentin", drugClass: "Anticonvulsant", indication: "Neuropathic Pain, Seizures", fdaApproved: true },
  { id: 68, name: "Lyrica", genericName: "pregabalin", drugClass: "Anticonvulsant", indication: "Fibromyalgia, Neuropathic Pain", fdaApproved: true },
  
  // Combination diabetes medications  
  { id: 69, name: "Invokamet", genericName: "canagliflozin/metformin", drugClass: "SGLT2 Inhibitor + Biguanide", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 70, name: "Synjardy", genericName: "empagliflozin/metformin", drugClass: "SGLT2 Inhibitor + Biguanide", indication: "Type 2 Diabetes", fdaApproved: true },
  { id: 71, name: "Xigduo", genericName: "dapagliflozin/metformin", drugClass: "SGLT2 Inhibitor + Biguanide", indication: "Type 2 Diabetes", fdaApproved: true },
{ id: 72, name: "Janumet", genericName: "sitagliptin/metformin", drugClass: "DPP-4 Inhibitor + Biguanide", indication: "Type 2 Diabetes", fdaApproved: true },
// gender gap drugs
{ id: 73, name: "Lopressor", genericName: "metoprolol tartrate", drugClass: "Beta-Blocker", indication: "High blood pressure (Hypertension), chest pain (Angina), rapid heart rate", fdaApproved: true },
{ id: 74, name: "Aspirin", genericName: "acetylsalicylic acid", drugClass: "NSAID / Antiplatelet", indication: "Chronic inflammation, fever, prevention of heart attack or stroke", fdaApproved: true },
{ id: 75, name: "Valium", genericName: "diazepam", drugClass: "Benzodiazepine", indication: "Severe anxiety, muscle spasms, alcohol withdrawal tremors, seizures", fdaApproved: true }
];

// Grouped medication by generic name
export interface GroupedMedication {
  id: number;
  genericName: string;
  brandNames: string[];
  drugClass: string;
  indication: string;
  fdaApproved: boolean;
}

// Group medications by generic name - this prevents duplicate API calls
export function getMedicationsGroupedByGeneric(): GroupedMedication[] {
  const grouped = new Map<string, GroupedMedication>();
  
  for (const med of MEDICATIONS) {
    const genericKey = med.genericName.toLowerCase();
    const existing = grouped.get(genericKey);
    
    if (!existing) {
      grouped.set(genericKey, {
        id: med.id,
        genericName: med.genericName,
        brandNames: [med.name],
        drugClass: med.drugClass,
        indication: med.indication,
        fdaApproved: med.fdaApproved,
      });
    } else {
      // Add brand name if it's different from generic name and not already in list
      if (med.name.toLowerCase() !== med.genericName.toLowerCase() && 
          !existing.brandNames.includes(med.name)) {
        existing.brandNames.push(med.name);
      }
      // Merge indications if different
      if (med.indication && !existing.indication.includes(med.indication)) {
        existing.indication = `${existing.indication}, ${med.indication}`;
      }
    }
  }
  
  return Array.from(grouped.values());
}

// Helper functions for searching/filtering
export function searchMedications(query: string): Medication[] {
  const q = query.toLowerCase().trim();
  return MEDICATIONS.filter(
    (med) =>
      med.name.toLowerCase().includes(q) ||
      med.genericName.toLowerCase().includes(q) ||
      med.indication.toLowerCase().includes(q) ||
      med.drugClass.toLowerCase().includes(q)
  );
}

export function searchMedicationsGrouped(query: string): GroupedMedication[] {
  const q = query.toLowerCase().trim();
  const allGrouped = getMedicationsGroupedByGeneric();
  return allGrouped.filter(
    (med) =>
      med.genericName.toLowerCase().includes(q) ||
      med.brandNames.some(b => b.toLowerCase().includes(q)) ||
      med.indication.toLowerCase().includes(q) ||
      med.drugClass.toLowerCase().includes(q)
  );
}

export function getMedicationById(id: number): Medication | undefined {
  return MEDICATIONS.find((med) => med.id === id);
}

export function getGroupedMedicationById(id: number): GroupedMedication | undefined {
  const med = MEDICATIONS.find((m) => m.id === id);
  if (!med) return undefined;
  
  // Find all medications with same generic name
  const sameMeds = MEDICATIONS.filter(m => 
    m.genericName.toLowerCase() === med.genericName.toLowerCase()
  );
  
  return {
    id: med.id,
    genericName: med.genericName,
    brandNames: [...new Set(sameMeds.map(m => m.name))],
    drugClass: med.drugClass,
    indication: [...new Set(sameMeds.map(m => m.indication))].join(', '),
    fdaApproved: sameMeds.some(m => m.fdaApproved),
  };
}

export function getMedicationByName(name: string): Medication | undefined {
  const n = name.toLowerCase().trim();
  return MEDICATIONS.find(
    (med) => med.name.toLowerCase() === n || med.genericName.toLowerCase() === n
  );
}
