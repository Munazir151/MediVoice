from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from uuid import uuid4

from qdrant_client.models import Distance, PointStruct, VectorParams

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings
from app.services.qdrant import QdrantService


def default_cases() -> list[dict[str, Any]]:
    return [
        # CARDIOVASCULAR DISEASES
        {"problem_label": "Upper Respiratory Tract Infection", "severity_score": "Green", "red_flags": ["High persistent fever", "Breathing difficulty"], "specialty": "General Practitioner", "summary": "Mild sore throat, nasal congestion, and dry cough for 2 days.", "text": "I have sore throat, runny nose, mild cough, and low fever since yesterday."},
        {"problem_label": "Acute Myocardial Infarction (Heart Attack)", "severity_score": "Red", "red_flags": ["Chest pain", "Shortness of breath", "Sweating", "Radiating pain to arm"], "specialty": "Cardiologist", "summary": "Severe chest pressure with radiating pain to left arm and breathlessness.", "text": "Severe chest pain, sweating, and pain spreading to my left arm started suddenly."},
        {"problem_label": "Acute Stroke / TIA", "severity_score": "Red", "red_flags": ["Facial drooping", "Arm weakness", "Speech difficulty", "Vision loss"], "specialty": "Neurologist", "summary": "Sudden neurological deficits requiring emergency evaluation.", "text": "I feel weakness on one side of my body, face drooping, and difficulty speaking."},
        {"problem_label": "Heart Failure / Acute Decompensation", "severity_score": "Red", "red_flags": ["Severe breathlessness", "Orthopnea", "Edema", "Chest pain"], "specialty": "Cardiologist", "summary": "Inability to breathe while lying down, leg swelling, and fatigue.", "text": "I can't breathe while lying down, my feet are swollen, and I feel very tired."},
        {"problem_label": "Atrial Fibrillation", "severity_score": "Yellow", "red_flags": ["Palpitations", "Chest pain", "Breathlessness", "Syncope"], "specialty": "Cardiologist", "summary": "Irregular heart rhythm with palpitations and chest discomfort.", "text": "My heart is beating irregularly and fast, with mild chest discomfort."},
        {"problem_label": "Pulmonary Embolism (Suspected)", "severity_score": "Red", "red_flags": ["Severe chest pain", "Breathlessness", "Leg pain or swelling"], "specialty": "Cardiologist", "summary": "Acute onset chest pain and breathlessness, possibly from leg clot.", "text": "I have sudden sharp chest pain, breathlessness, and my leg is swollen and painful."},
        {"problem_label": "Deep Vein Thrombosis (DVT)", "severity_score": "Yellow", "red_flags": ["Severe leg pain", "Leg swelling", "Redness", "Warmth"], "specialty": "Cardiologist", "summary": "One leg is significantly swollen, painful, red, and warm to touch.", "text": "One leg is swollen, painful, red, and warm, with no clear injury."},
        {"problem_label": "Myocarditis / Pericarditis", "severity_score": "Yellow", "red_flags": ["Chest pain worse with breathing", "Fever", "Shortness of breath"], "specialty": "Cardiologist", "summary": "Chest pain that worsens with deep breathing and lying down.", "text": "I have chest pain that gets worse when I breathe deeply or lie flat."},
        {"problem_label": "Aortic Dissection (Suspected)", "severity_score": "Red", "red_flags": ["Severe tearing chest pain", "Back pain", "Hypertension", "Syncope"], "specialty": "Cardiologist", "summary": "Sudden severe chest and back pain requiring emergency evaluation.", "text": "Severe tearing pain in my chest and back started suddenly."},
        
        # RESPIRATORY DISEASES
        {"problem_label": "Acute Bronchitis", "severity_score": "Yellow", "red_flags": ["Breathlessness", "Worsening cough"], "specialty": "Pulmonologist", "summary": "Persistent productive cough and chest discomfort.", "text": "My cough has worsened with phlegm and mild chest tightness for four days."},
        {"problem_label": "Community-Acquired Pneumonia", "severity_score": "Yellow", "red_flags": ["High fever", "Severe cough", "Breathlessness", "Chest pain"], "specialty": "Pulmonologist", "summary": "Fever with productive cough and chest pain, possible lung infection.", "text": "I have high fever, cough with green phlegm, and sharp chest pain when breathing."},
        {"problem_label": "Asthma Exacerbation", "severity_score": "Yellow", "red_flags": ["Wheezing", "Breathlessness at rest", "Peak flow drop"], "specialty": "Pulmonologist", "summary": "Wheezing and shortness of breath with known asthma history.", "text": "I am wheezing and finding it hard to breathe, especially while speaking."},
        {"problem_label": "COPD Exacerbation", "severity_score": "Yellow", "red_flags": ["Severe breathlessness", "Increased sputum", "Color change in sputum"], "specialty": "Pulmonologist", "summary": "Chronic obstructive pulmonary disease flare with worsening breathing.", "text": "My chronic breathing problem has worsened with more cough and thick phlegm."},
        {"problem_label": "Acute Pulmonary Edema", "severity_score": "Red", "red_flags": ["Severe breathlessness", "Pink frothy sputum", "Crackles"], "specialty": "Pulmonologist", "summary": "Fluid in lungs causing severe breathlessness and pink sputum.", "text": "I can barely breathe, coughing up pink foamy liquid."},
        {"problem_label": "Spontaneous Pneumothorax", "severity_score": "Red", "red_flags": ["Sudden chest pain", "Breathlessness", "Collapsed lung"], "specialty": "Pulmonologist", "summary": "Sudden collapse of lung causing acute chest pain and breathlessness.", "text": "Sudden sharp chest pain and breathlessness without any injury."},
        {"problem_label": "Tuberculosis (Active)", "severity_score": "Red", "red_flags": ["Chronic cough", "Hemoptysis", "Night sweats", "Fever"], "specialty": "Pulmonologist", "summary": "Chronic cough with blood, fever, and weight loss over weeks.", "text": "I have had chronic cough for weeks with blood in sputum and night sweats."},
        {"problem_label": "Influenza / Seasonal Flu", "severity_score": "Yellow", "red_flags": ["High fever", "Severe body ache", "Respiratory symptoms"], "specialty": "General Practitioner", "summary": "Sudden onset of fever, cough, body ache, and fatigue.", "text": "I have high fever, cough, severe body ache, and feel very weak."},
        {"problem_label": "COVID-19", "severity_score": "Yellow", "red_flags": ["Fever", "Cough", "Loss of taste/smell", "Breathlessness"], "specialty": "General Practitioner", "summary": "Fever, cough, loss of taste/smell with possible exposure.", "text": "I have fever, dry cough, and I can't taste or smell anything."},
        
        # GASTROINTESTINAL DISEASES
        {"problem_label": "Gastroenteritis", "severity_score": "Yellow", "red_flags": ["Dehydration", "Blood in stool", "Severe abdominal pain"], "specialty": "Gastroenterologist", "summary": "Vomiting, loose stools, abdominal cramps.", "text": "I have abdominal cramps, vomiting, and diarrhea since morning."},
        {"problem_label": "Peptic Ulcer Disease", "severity_score": "Yellow", "red_flags": ["Vomiting blood", "Black stool", "Severe epigastric pain"], "specialty": "Gastroenterologist", "summary": "Burning stomach pain, especially when hungry, with history of NSAID use.", "text": "I have severe burning pain in my upper abdomen, especially at night."},
        {"problem_label": "Acute Cholecystitis / Gallstones", "severity_score": "Yellow", "red_flags": ["Right upper quadrant pain", "Fever", "Vomiting", "Jaundice"], "specialty": "General Surgeon", "summary": "Sudden severe pain in upper right abdomen after fatty meal.", "text": "I have severe pain in my upper right abdomen that started after eating fatty food."},
        {"problem_label": "Acute Pancreatitis", "severity_score": "Red", "red_flags": ["Severe epigastric pain", "Vomiting", "Elevated amylase", "Shock"], "specialty": "Gastroenterologist", "summary": "Severe central abdominal pain radiating to back with vomiting.", "text": "Severe pain in upper abdomen radiating to my back with vomiting."},
        {"problem_label": "Hepatitis / Liver Inflammation", "severity_score": "Yellow", "red_flags": ["Jaundice", "Dark urine", "Pale stool", "Abdominal pain"], "specialty": "Gastroenterologist", "summary": "Yellow discoloration of skin and eyes, dark urine, and abdominal pain.", "text": "My skin and eyes turned yellow, urine is dark brown, and I feel unwell."},
        {"problem_label": "Cirrhosis / Advanced Liver Disease", "severity_score": "Red", "red_flags": ["Ascites", "Variceal bleeding", "Encephalopathy", "Hepatic failure"], "specialty": "Gastroenterologist", "summary": "Advanced liver disease with abdominal swelling and bleeding.", "text": "My belly is very swollen, I vomited blood, and I'm confused."},
        {"problem_label": "Inflammatory Bowel Disease (Crohn's/UC)", "severity_score": "Yellow", "red_flags": ["Bloody diarrhea", "Severe abdominal pain", "Weight loss", "Fever"], "specialty": "Gastroenterologist", "summary": "Chronic diarrhea with blood, abdominal pain, and systemic symptoms.", "text": "I have chronic diarrhea with blood, severe abdominal pain, and weight loss."},
        {"problem_label": "Acid Reflux / GERD", "severity_score": "Green", "red_flags": ["Vomiting blood", "Black stool", "Severe dysphagia"], "specialty": "Gastroenterologist", "summary": "Burning stomach discomfort or acidity, often after meals.", "text": "I have burning in my stomach and acidity after meals with some nausea."},
        {"problem_label": "Constipation / Impaction", "severity_score": "Green", "red_flags": ["Abdominal distension", "Severe pain", "Toxic megacolon"], "specialty": "General Practitioner", "summary": "Difficulty passing stools and abdominal discomfort.", "text": "I haven't had a bowel movement in days and feel uncomfortable and bloated."},
        {"problem_label": "Acute Diarrhea", "severity_score": "Yellow", "red_flags": ["Severe dehydration", "Bloody stools", "High fever"], "specialty": "General Practitioner", "summary": "Acute onset of loose stools with abdominal cramping.", "text": "I have loose stools with abdominal cramps for the past two days."},
        
        # NEUROLOGICAL DISEASES
        {"problem_label": "Migraine Episode", "severity_score": "Green", "red_flags": ["Sudden worst headache", "Neurological deficits"], "specialty": "Neurologist", "summary": "Recurring unilateral headache with photophobia.", "text": "I have one-sided headache with sensitivity to light and mild nausea."},
        {"problem_label": "Tension Headache", "severity_score": "Green", "red_flags": ["Persistent daily headache", "Muscle tension"], "specialty": "General Practitioner", "summary": "Bilateral pressure-type headache with neck tension.", "text": "I have a pressure-like headache, especially with stress and neck tension."},
        {"problem_label": "Cluster Headache", "severity_score": "Yellow", "red_flags": ["Severe unilateral eye pain", "Autonomic symptoms"], "specialty": "Neurologist", "summary": "Severe unilateral pain around the eye with tearing and redness.", "text": "I have severe pain around one eye with tears and redness."},
        {"problem_label": "Seizure / Epilepsy", "severity_score": "Red", "red_flags": ["Loss of consciousness", "Convulsions", "Tongue biting"], "specialty": "Neurologist", "summary": "Sudden loss of consciousness with convulsions and confusion.", "text": "I lost consciousness, had jerking movements, and don't remember what happened."},
        {"problem_label": "Syncope / Fainting", "severity_score": "Yellow", "red_flags": ["Prolonged unconsciousness", "Cardiac cause", "Injuries"], "specialty": "Cardiologist", "summary": "Brief loss of consciousness with rapid recovery.", "text": "I suddenly felt dizzy and lost consciousness for a moment."},
        {"problem_label": "Vertigo / Dizziness", "severity_score": "Green", "red_flags": ["Severe imbalance", "Nystagmus", "Neurological signs"], "specialty": "ENT Specialist", "summary": "Sensation of spinning with balance disturbance.", "text": "I feel like everything is spinning and I'm losing my balance."},
        {"problem_label": "Peripheral Neuropathy", "severity_score": "Yellow", "red_flags": ["Severe sensory loss", "Motor weakness", "Autonomic symptoms"], "specialty": "Neurologist", "summary": "Numbness, tingling, and weakness in hands and feet.", "text": "My hands and feet feel numb and tingly with weakness."},
        {"problem_label": "Parkinson's Disease", "severity_score": "Yellow", "red_flags": ["Tremor", "Rigidity", "Bradykinesia"], "specialty": "Neurologist", "summary": "Progressive tremor, slowness of movement, and rigidity.", "text": "My hands shake, I move slowly, and my muscles feel stiff."},
        {"problem_label": "Meningitis / Encephalitis", "severity_score": "Red", "red_flags": ["High fever", "Neck stiffness", "Altered consciousness"], "specialty": "Neurologist", "summary": "Fever with severe headache and neck rigidity requiring emergency care.", "text": "I have high fever, severe headache, stiff neck, and feel confused."},
        {"problem_label": "Migraine with Aura", "severity_score": "Green", "red_flags": ["Visual disturbances", "Numbness", "Speech difficulty"], "specialty": "Neurologist", "summary": "Headache preceded by visual or sensory aura.", "text": "I see flashing lights followed by a one-sided headache."},
        
        # INFECTIOUS DISEASES
        {"problem_label": "Urinary Tract Infection", "severity_score": "Yellow", "red_flags": ["High fever", "Flank pain", "Sepsis"], "specialty": "General Practitioner", "summary": "Burning urination and increased frequency.", "text": "I feel burning while passing urine and need to urinate very frequently."},
        {"problem_label": "Pyelonephritis (Kidney Infection)", "severity_score": "Yellow", "red_flags": ["High fever", "Flank pain", "Sepsis"], "specialty": "Nephrologist", "summary": "Fever with severe flank pain and dysuria.", "text": "I have high fever and severe pain in my lower back and side."},
        {"problem_label": "Bacterial Pneumonia", "severity_score": "Yellow", "red_flags": ["High fever", "Productive cough", "Hypoxia"], "specialty": "Pulmonologist", "summary": "Fever with productive cough and chest pain.", "text": "I have high fever, cough with thick green sputum, and chest pain."},
        {"problem_label": "Malaria", "severity_score": "Yellow", "red_flags": ["High spiking fever", "Chills", "Recent travel"], "specialty": "General Practitioner", "summary": "Recurrent fever with chills, after travel to endemic area.", "text": "I have high fever with severe chills after returning from a tropical country."},
        {"problem_label": "Dengue Fever", "severity_score": "Yellow", "red_flags": ["High fever", "Rash", "Hemorrhage", "Shock"], "specialty": "General Practitioner", "summary": "Fever, body ache, rash, and potential hemorrhage.", "text": "I have high fever, severe body ache, and a rash appeared on my body."},
        {"problem_label": "Typhoid Fever", "severity_score": "Yellow", "red_flags": ["High fever", "Rose spots", "GI symptoms"], "specialty": "General Practitioner", "summary": "Sustained high fever with abdominal symptoms.", "text": "I have been having high fever for a week with abdominal pain."},
        {"problem_label": "Chickenpox / Varicella", "severity_score": "Green", "red_flags": ["High fever", "Secondary infection", "Encephalitis"], "specialty": "General Practitioner", "summary": "Fever with characteristic vesicular rash in crops.", "text": "I have fever and fluid-filled blisters appearing in crops on my body."},
        {"problem_label": "Measles", "severity_score": "Yellow", "red_flags": ["High fever", "Koplik spots", "Complications"], "specialty": "General Practitioner", "summary": "High fever, cough, coryza, and maculopapular rash.", "text": "I have high fever, cough, and a red rash spreading from my face."},
        {"problem_label": "Mumps", "severity_score": "Green", "red_flags": ["Severe pain", "Orchitis", "Meningitis"], "specialty": "General Practitioner", "summary": "Fever with swollen and tender salivary glands.", "text": "I have fever and both my cheeks are very swollen and painful."},
        {"problem_label": "Pertussis (Whooping Cough)", "severity_score": "Yellow", "red_flags": ["Severe cough", "Apnea", "Pneumonia"], "specialty": "General Practitioner", "summary": "Severe paroxysmal cough with characteristic whoop.", "text": "I have severe fits of cough followed by a whooping sound when breathing in."},
        
        # ENDOCRINE DISEASES
        {"problem_label": "Type 2 Diabetes Mellitus", "severity_score": "Yellow", "red_flags": ["Polyuria", "Polydipsia", "DKA", "HHS"], "specialty": "Endocrinologist", "summary": "Blood sugar symptoms like frequent urination, thirst, or fatigue.", "text": "I feel very thirsty, urinate often, and feel tired most days."},
        {"problem_label": "Diabetic Ketoacidosis (DKA)", "severity_score": "Red", "red_flags": ["Severe acidosis", "Altered consciousness", "Fruity breath"], "specialty": "Endocrinologist", "summary": "Life-threatening diabetes complication with severe metabolic acidosis.", "text": "I have severe nausea, vomiting, rapid breathing, and confusion with diabetes."},
        {"problem_label": "Hyperglycemia / High Blood Sugar", "severity_score": "Yellow", "red_flags": ["Extreme thirst", "Vision changes", "Weakness"], "specialty": "Endocrinologist", "summary": "Elevated blood glucose with symptoms of hyperglycemia.", "text": "My blood sugar is very high with extreme thirst and vision changes."},
        {"problem_label": "Hypoglycemia / Low Blood Sugar", "severity_score": "Yellow", "red_flags": ["Unconsciousness", "Seizure", "Severe hypoglycemia"], "specialty": "Endocrinologist", "summary": "Dangerously low blood sugar requiring urgent treatment.", "text": "I feel shaky, sweaty, confused, and my blood sugar is very low."},
        {"problem_label": "Hypothyroidism / Thyroid Failure", "severity_score": "Green", "red_flags": ["Myxedema coma", "Severe bradycardia"], "specialty": "Endocrinologist", "summary": "Fatigue, weight gain, cold intolerance, and slow metabolism.", "text": "I feel very tired, gained weight, and feel cold all the time."},
        {"problem_label": "Hyperthyroidism / Thyroid Excess", "severity_score": "Yellow", "red_flags": ["Atrial fibrillation", "Heart failure", "Thyroid storm"], "specialty": "Endocrinologist", "summary": "Weight loss, palpitations, anxiety, and heat intolerance.", "text": "I feel anxious, my heart is racing, I sweat a lot, and feel hot."},
        {"problem_label": "Thyroid Storm", "severity_score": "Red", "red_flags": ["High fever", "Altered consciousness", "Shock"], "specialty": "Endocrinologist", "summary": "Life-threatening thyroid crisis with fever and altered mental status.", "text": "I have high fever, fast heartbeat, confusion, and feel very unwell."},
        
        # UROLOGICAL DISEASES
        {"problem_label": "Kidney Stones / Nephrolithiasis", "severity_score": "Yellow", "red_flags": ["Severe flank pain", "Hydronephrosis", "Infection"], "specialty": "Urologist", "summary": "Severe flank pain with hematuria, typically colicky.", "text": "I have severe sharp pain in my flank with blood in urine."},
        {"problem_label": "Benign Prostatic Hyperplasia", "severity_score": "Green", "red_flags": ["Urinary retention", "Recurrent infection"], "specialty": "Urologist", "summary": "Urinary frequency, urgency, and weak stream.", "text": "I have frequent urination, especially at night, with weak urine stream."},
        {"problem_label": "Prostate Cancer / Malignancy", "severity_score": "Yellow", "red_flags": ["Advanced disease", "Metastasis", "Bone pain"], "specialty": "Urologist", "summary": "Urinary symptoms with elevated PSA, biopsy confirmed malignancy.", "text": "I have urinary symptoms and abnormal prostate cancer screening."},
        {"problem_label": "Acute Urinary Retention", "severity_score": "Yellow", "red_flags": ["Severe suprapubic pain", "Bladder rupture"], "specialty": "Urologist", "summary": "Inability to urinate despite desire, with bladder distension.", "text": "I cannot urinate and have severe pain in my lower abdomen."},
        
        # RHEUMATOLOGICAL DISEASES
        {"problem_label": "Rheumatoid Arthritis", "severity_score": "Yellow", "red_flags": ["Severe joint destruction", "Systemic complications"], "specialty": "Rheumatologist", "summary": "Symmetrical joint pain and swelling, especially in hands.", "text": "I have symmetrical pain and swelling in my hands and wrists."},
        {"problem_label": "Systemic Lupus Erythematosus (SLE)", "severity_score": "Yellow", "red_flags": ["Renal involvement", "CNS involvement", "Serositis"], "specialty": "Rheumatologist", "summary": "Malar rash, joint pain, photosensitivity, and systemic involvement.", "text": "I have a butterfly rash on my face, joint pain, and feel very tired."},
        {"problem_label": "Gout", "severity_score": "Green", "red_flags": ["Severe inflammatory arthritis"], "specialty": "Rheumatologist", "summary": "Sudden severe pain and swelling in great toe or other joints.", "text": "My big toe is suddenly very swollen, red, and painful."},
        {"problem_label": "Ankylosing Spondylitis", "severity_score": "Yellow", "red_flags": ["Progressive spinal fusion", "Anterior uveitis"], "specialty": "Rheumatologist", "summary": "Chronic back pain with morning stiffness and spinal limitation.", "text": "I have chronic back pain that is worst in the morning and improves with activity."},
        
        # HEMATOLOGICAL DISEASES
        {"problem_label": "Iron Deficiency Anemia", "severity_score": "Yellow", "red_flags": ["Severe anemia", "Hemodynamic compromise"], "specialty": "Hematologist", "summary": "Fatigue, shortness of breath, and pale appearance.", "text": "I feel very tired, breathless, and my skin looks pale."},
        {"problem_label": "Pernicious Anemia / B12 Deficiency", "severity_score": "Yellow", "red_flags": ["Neurological symptoms", "Pancytopenia"], "specialty": "Hematologist", "summary": "Fatigue with neurological symptoms like numbness and weakness.", "text": "I feel very tired, my hands tingle, and I feel weak."},
        {"problem_label": "Sickle Cell Disease Crisis", "severity_score": "Red", "red_flags": ["Severe pain", "Acute chest syndrome", "Stroke"], "specialty": "Hematologist", "summary": "Acute severe pain, fever, and potential organ involvement.", "text": "I have severe pain all over my body, high fever, and feel very unwell."},
        {"problem_label": "Thrombocytopenia / Low Platelets", "severity_score": "Yellow", "red_flags": ["Severe bleeding", "Intracranial hemorrhage"], "specialty": "Hematologist", "summary": "Easy bruising and spontaneous bleeding with low platelet count.", "text": "I have easy bruising, frequent nosebleeds, and bleeding gums."},
        {"problem_label": "Acute Leukemia", "severity_score": "Red", "red_flags": ["Severe infection", "Bleeding", "Infiltration"], "specialty": "Hematologist", "summary": "Fever, bleeding, and lymphadenopathy with abnormal blood counts.", "text": "I have fever, bleeding gums, enlarged lymph nodes, and feel very unwell."},
        
        # ORTHOPEDIC CONDITIONS
        {"problem_label": "Musculoskeletal Knee Pain", "severity_score": "Green", "red_flags": ["Unable to bear weight", "Joint swelling"], "specialty": "Orthopedic Surgeon", "summary": "Pain around the knee joint that worsens with movement.", "text": "I have knee joint pain while walking and climbing stairs."},
        {"problem_label": "Osteoarthritis Flare", "severity_score": "Green", "red_flags": ["Severe swelling", "Locked joint"], "specialty": "Orthopedic Surgeon", "summary": "Chronic joint pain and stiffness, especially in knees and hands.", "text": "My knee hurts more in the morning with stiffness and it feels like arthritis pain."},
        {"problem_label": "Sprain / Soft Tissue Injury", "severity_score": "Green", "red_flags": ["Inability to walk", "Severe swelling"], "specialty": "General Practitioner", "summary": "Pain after twisting or overuse with mild swelling.", "text": "I twisted my knee and now it is painful with mild swelling when I walk."},
        {"problem_label": "Back Pain / Muscle Strain", "severity_score": "Green", "red_flags": ["Leg weakness", "Loss of bladder control"], "specialty": "General Practitioner", "summary": "Mechanical back pain that worsens on bending or lifting.", "text": "I have lower back pain after lifting something heavy."},
        {"problem_label": "Herniated Disc", "severity_score": "Yellow", "red_flags": ["Severe radiculopathy", "Cauda equina syndrome"], "specialty": "Orthopedic Surgeon", "summary": "Back pain radiating to leg with numbness and weakness.", "text": "I have back pain radiating down my leg with numbness."},
        {"problem_label": "Fracture / Bone Injury", "severity_score": "Yellow", "red_flags": ["Severe pain", "Deformity", "Neurovascular compromise"], "specialty": "Orthopedic Surgeon", "summary": "Acute pain, swelling, and deformity after trauma.", "text": "I fell and have severe pain and swelling in my arm with deformity."},
        {"problem_label": "Rotator Cuff Injury", "severity_score": "Yellow", "red_flags": ["Severe pain", "Loss of function"], "specialty": "Orthopedic Surgeon", "summary": "Shoulder pain worse at night and with overhead movements.", "text": "I have shoulder pain that is worse at night and when I lift my arm."},
        
        # OPHTHALMOLOGICAL CONDITIONS
        {"problem_label": "Conjunctivitis", "severity_score": "Green", "red_flags": ["Severe eye pain", "Vision loss"], "specialty": "Ophthalmologist", "summary": "Red, itchy, watery eyes with mild discharge.", "text": "I have red itchy eyes with watery discharge and irritation."},
        {"problem_label": "Cataract Concern", "severity_score": "Yellow", "red_flags": ["Sudden vision loss", "Severe eye pain"], "specialty": "Ophthalmologist", "summary": "Blurred vision, glare, and difficulty seeing clearly.", "text": "My vision is blurry and lights glare at night."},
        {"problem_label": "Glaucoma Concern", "severity_score": "Red", "red_flags": ["Severe eye pain", "Sudden vision changes"], "specialty": "Ophthalmologist", "summary": "Eye pressure concern with pain and vision changes.", "text": "I have severe eye pain with halos around lights and blurred vision."},
        {"problem_label": "Refractive Error / Myopia", "severity_score": "Green", "red_flags": ["Severe myopia with complications"], "specialty": "Ophthalmologist", "summary": "Difficulty seeing distant objects clearly.", "text": "I cannot see distant objects clearly without glasses."},
        {"problem_label": "Diabetic Retinopathy", "severity_score": "Yellow", "red_flags": ["Vision loss", "Severe proliferation"], "specialty": "Ophthalmologist", "summary": "Vision changes from diabetes-related eye damage.", "text": "My vision is becoming blurry and I see floaters."},
        {"problem_label": "Macular Degeneration", "severity_score": "Yellow", "red_flags": ["Central vision loss", "Advanced disease"], "specialty": "Ophthalmologist", "summary": "Progressive central vision loss with age-related changes.", "text": "I have progressive loss of central vision making it hard to read."},
        {"problem_label": "Retinal Detachment", "severity_score": "Red", "red_flags": ["Sudden vision loss", "Flashing lights", "Floaters"], "specialty": "Ophthalmologist", "summary": "Sudden vision loss with flashing lights and floaters.", "text": "I see sudden flashing lights and many floaters with vision loss."},
        
        # ENT CONDITIONS
        {"problem_label": "Allergic Rhinitis", "severity_score": "Green", "red_flags": ["Breathing distress", "Facial swelling"], "specialty": "ENT Specialist", "summary": "Sneezing, itchy eyes, clear nasal discharge.", "text": "I have sneezing, itchy nose, and watery eyes after dust exposure."},
        {"problem_label": "Otitis Media", "severity_score": "Green", "red_flags": ["Severe ear pain", "Hearing loss"], "specialty": "ENT Specialist", "summary": "Ear pain with blocked sensation and mild fever.", "text": "I have pain in my ear with slight fever and reduced hearing."},
        {"problem_label": "Acute Sinusitis", "severity_score": "Green", "red_flags": ["High fever", "Severe headache", "Meningitis risk"], "specialty": "ENT Specialist", "summary": "Nasal congestion, facial pain, and thick discharge.", "text": "I have nasal congestion, facial pain, and thick colored nasal discharge."},
        {"problem_label": "Pharyngitis / Sore Throat", "severity_score": "Green", "red_flags": ["Difficulty swallowing", "High fever"], "specialty": "ENT Specialist", "summary": "Sore throat with difficulty swallowing.", "text": "My throat is very sore and painful to swallow."},
        {"problem_label": "Acute Tonsillitis", "severity_score": "Yellow", "red_flags": ["Severe pain", "Airway obstruction", "Sepsis"], "specialty": "ENT Specialist", "summary": "Swollen inflamed tonsils with fever and pain.", "text": "My tonsils are very large and inflamed with severe pain."},
        {"problem_label": "Eustachian Tube Dysfunction", "severity_score": "Green", "red_flags": ["Persistent symptoms", "Hearing loss"], "specialty": "ENT Specialist", "summary": "Feeling of fullness in ear with hearing reduction.", "text": "My ear feels blocked and full with reduced hearing."},
        {"problem_label": "Vocal Cord Nodules / Polyps", "severity_score": "Green", "red_flags": ["Persistent hoarseness"], "specialty": "ENT Specialist", "summary": "Hoarseness and voice changes from vocal cord growths.", "text": "I have hoarse voice that doesn't improve."},
        
        # DERMATOLOGICAL CONDITIONS
        {"problem_label": "Urticaria / Hives", "severity_score": "Green", "red_flags": ["Angioedema", "Anaphylaxis"], "specialty": "Dermatologist", "summary": "Itchy raised red bumps on skin with allergic trigger.", "text": "I have itchy red bumps all over my body."},
        {"problem_label": "Eczema / Atopic Dermatitis", "severity_score": "Green", "red_flags": ["Severe itching", "Infection risk"], "specialty": "Dermatologist", "summary": "Itchy, dry, inflamed skin with characteristic distribution.", "text": "I have itchy, dry, inflamed patches of skin."},
        {"problem_label": "Psoriasis", "severity_score": "Green", "red_flags": ["Severe disease", "Joint involvement"], "specialty": "Dermatologist", "summary": "Red scaly patches on skin with silvery appearance.", "text": "I have red scaly patches on my skin with silvery appearance."},
        {"problem_label": "Acne", "severity_score": "Green", "red_flags": ["Severe cystic acne", "Scarring"], "specialty": "Dermatologist", "summary": "Comedones and pustules, especially on face and upper back.", "text": "I have pimples and blackheads on my face and back."},
        {"problem_label": "Fungal Infection / Ringworm", "severity_score": "Green", "red_flags": ["Severe infection", "Systemic involvement"], "specialty": "Dermatologist", "summary": "Red scaly circular patches with itching.", "text": "I have circular red scaly patches with itching."},
        {"problem_label": "Bacterial Infection / Impetigo", "severity_score": "Yellow", "red_flags": ["Systemic infection", "Cellulitis"], "specialty": "Dermatologist", "summary": "Honey-crusted lesions with surrounding erythema.", "text": "I have honey-colored crusts on my skin with redness."},
        {"problem_label": "Vitiligo", "severity_score": "Green", "red_flags": ["Extensive involvement", "Psychological impact"], "specialty": "Dermatologist", "summary": "Loss of skin pigmentation in patches.", "text": "I have patches of skin losing color on my body."},
        
        # OBSTETRIC/GYNECOLOGICAL CONDITIONS
        {"problem_label": "Dysmenorrhea", "severity_score": "Green", "red_flags": ["Severe pain", "Secondary causes"], "specialty": "Gynecologist", "summary": "Severe menstrual cramps and pain.", "text": "I have severe menstrual cramps and pain."},
        {"problem_label": "Polycystic Ovary Syndrome (PCOS)", "severity_score": "Green", "red_flags": ["Infertility", "Metabolic complications"], "specialty": "Gynecologist", "summary": "Irregular periods, hirsutism, and polycystic ovaries.", "text": "I have irregular periods, excess hair, and difficulty getting pregnant."},
        {"problem_label": "Endometriosis", "severity_score": "Yellow", "red_flags": ["Severe pain", "Infertility"], "specialty": "Gynecologist", "summary": "Severe menstrual pain and pain during intercourse.", "text": "I have severe pain during periods and intercourse."},
        {"problem_label": "Uterine Fibroids", "severity_score": "Green", "red_flags": ["Heavy bleeding", "Anemia"], "specialty": "Gynecologist", "summary": "Heavy menstrual bleeding and pelvic pressure.", "text": "I have very heavy menstrual bleeding and pelvic pressure."},
        {"problem_label": "Pelvic Inflammatory Disease (PID)", "severity_score": "Yellow", "red_flags": ["Sepsis", "Infertility"], "specialty": "Gynecologist", "summary": "Lower abdominal pain with vaginal discharge.", "text": "I have lower abdominal pain, fever, and vaginal discharge."},
        
        # PSYCHIATRIC CONDITIONS
        {"problem_label": "Anxiety Disorder", "severity_score": "Green", "red_flags": ["Severe anxiety", "Suicidal ideation"], "specialty": "Psychiatrist", "summary": "Persistent worry with physical symptoms.", "text": "I feel constantly anxious and worried about many things."},
        {"problem_label": "Depression", "severity_score": "Yellow", "red_flags": ["Suicidal ideation", "Severe depression"], "specialty": "Psychiatrist", "summary": "Persistent sadness, loss of interest, and fatigue.", "text": "I feel sad and hopeless with no interest in things I enjoy."},
        {"problem_label": "Bipolar Disorder", "severity_score": "Yellow", "red_flags": ["Severe mania", "Psychotic features"], "specialty": "Psychiatrist", "summary": "Alternating episodes of mania and depression.", "text": "I have periods of high energy and extreme sadness."},
        {"problem_label": "Obsessive Compulsive Disorder", "severity_score": "Green", "red_flags": ["Severe OCD", "Disability"], "specialty": "Psychiatrist", "summary": "Intrusive thoughts with compulsive behaviors.", "text": "I have unwanted thoughts and need to repeat actions."},
        {"problem_label": "Post-Traumatic Stress Disorder", "severity_score": "Yellow", "red_flags": ["Acute PTSD", "Suicidal ideation"], "specialty": "Psychiatrist", "summary": "Flashbacks, nightmares, and hypervigilance after trauma.", "text": "I have flashbacks and nightmares from a traumatic event."},
        
        # OTHER MAJOR CONDITIONS
        {"problem_label": "Acute Appendicitis (Suspected)", "severity_score": "Red", "red_flags": ["Right lower abdominal pain", "Fever", "Perforation"], "specialty": "General Surgeon", "summary": "Progressive right lower quadrant pain with fever.", "text": "Pain started near my navel and moved to the lower right abdomen."},
        {"problem_label": "Bowel Obstruction", "severity_score": "Red", "red_flags": ["Severe abdominal pain", "Vomiting", "Shock"], "specialty": "General Surgeon", "summary": "Abdominal pain with inability to pass stool or gas.", "text": "I have severe abdominal pain and cannot pass stool or gas."},
        {"problem_label": "Sepsis / Severe Infection", "severity_score": "Red", "red_flags": ["Shock", "Organ failure", "Death"], "specialty": "General Practitioner", "summary": "Life-threatening systemic response to infection.", "text": "I have high fever, fast heartbeat, rapid breathing, and feel very unwell."},
        {"problem_label": "Anaphylaxis / Severe Allergy", "severity_score": "Red", "red_flags": ["Airway swelling", "Hypotension", "Shock"], "specialty": "General Practitioner", "summary": "Life-threatening allergic reaction requiring emergency care.", "text": "I have difficulty breathing, swelling of face and throat, after exposure."},
        {"problem_label": "Dehydration / Hypovolemic Shock", "severity_score": "Yellow", "red_flags": ["Severe dehydration", "Shock"], "specialty": "General Practitioner", "summary": "Severe fluid loss with weakness and dizziness.", "text": "I feel very dizzy, weak, and very thirsty from diarrhea and vomiting."},
        {"problem_label": "Hypothermia / Cold Exposure", "severity_score": "Red", "red_flags": ["Severe hypothermia", "Cardiac dysrhythmia"], "specialty": "General Practitioner", "summary": "Dangerous drop in body temperature from cold exposure.", "text": "I was exposed to extreme cold and now feel disoriented and very cold."},
        {"problem_label": "Heat Stroke", "severity_score": "Red", "red_flags": ["Core temp >40C", "CNS dysfunction"], "specialty": "General Practitioner", "summary": "Life-threatening heat illness with altered consciousness.", "text": "I have high body temperature, confusion, and feel very weak from heat exposure."},
        {"problem_label": "Drug Overdose / Poisoning", "severity_score": "Red", "red_flags": ["Respiratory depression", "Altered consciousness"], "specialty": "General Practitioner", "summary": "Toxicity from drug or poison ingestion requiring urgent care.", "text": "I took too much medication and feel confused and drowsy."},
        {"problem_label": "Burns / Severe Trauma", "severity_score": "Red", "red_flags": ["Deep burns", "Respiratory involvement"], "specialty": "General Surgeon", "summary": "Significant thermal injury requiring specialized care.", "text": "I have severe burns on large areas of my body."},
        {"problem_label": "Snake Bite / Envenomation", "severity_score": "Red", "red_flags": ["Neurotoxin", "Coagulopathy", "Hemorrhage"], "specialty": "General Practitioner", "summary": "Snakebite with potential systemic envenomation.", "text": "I was bitten by a snake and have swelling and pain at the bite site."},
    ]


def load_cases(source_file: str | None) -> list[dict[str, Any]]:
    if not source_file:
        return default_cases()

    source_path = Path(source_file)
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    data = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Source file must be a JSON array of case objects")

    return data


def build_case_text(case: dict[str, Any]) -> str:
    if case.get("text"):
        return str(case["text"])

    fragments = [
        str(case.get("problem_label") or ""),
        str(case.get("summary") or ""),
        " ".join(str(flag) for flag in case.get("red_flags", [])),
        str(case.get("specialty") or ""),
    ]
    text = " ".join(fragment for fragment in fragments if fragment).strip()
    if not text:
        raise ValueError("Each case must include at least one text field")
    return text


def ensure_collection(qdrant_service: QdrantService, recreate: bool) -> None:
    collection_name = qdrant_service.settings.qdrant_collection_name
    vector_size = max(8, qdrant_service.settings.qdrant_vector_size)

    if recreate:
        qdrant_service.client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        return

    try:
        qdrant_service.client.get_collection(collection_name)
    except Exception:
        qdrant_service.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def index_cases(source_file: str | None, recreate: bool) -> int:
    settings = get_settings()
    qdrant_service = QdrantService(settings)
    ensure_collection(qdrant_service, recreate=recreate)

    cases = load_cases(source_file)
    points: list[PointStruct] = []

    for case in cases:
        text = build_case_text(case)
        vector = qdrant_service._embed_text(text)

        payload = {
            "problem_label": str(case.get("problem_label") or "Unknown problem"),
            "severity_score": str(case.get("severity_score") or "Yellow"),
            "red_flags": list(case.get("red_flags") or []),
            "specialty": case.get("specialty"),
            "summary": case.get("summary") or text,
            "source_text": text,
        }

        points.append(
            PointStruct(
                id=str(case.get("id") or uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    qdrant_service.client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points,
        wait=True,
    )

    return len(points)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index symptom cases into Qdrant")
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="Optional JSON file containing symptom cases",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Recreate collection before indexing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    indexed = index_cases(source_file=args.source, recreate=args.recreate)
    print(f"Indexed {indexed} symptom cases into Qdrant collection.")


if __name__ == "__main__":
    main()
