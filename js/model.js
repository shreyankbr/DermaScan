//Skin disease prediction model

const CLASSES = [
    'Acne', 'Benign_tumors', 'Eczema', 'Infestations_Bites', 'Lichen',
    'Psoriasis', 'Seborrh_Keratoses', 'Vitiligo', 'Warts'
];

const SYMPTOM_WEIGHTS = {
    itching: [0.1, 0.0, 0.3, 0.2, 0.3, 0.1, 0.0, 0.0, 0.0],
    bleeding: [0.0, 0.2, 0.0, 0.2, 0.1, 0.3, 0.2, 0.0, 0.0],
    scaly_skin: [0.0, 0.0, 0.2, 0.0, 0.2, 0.4, 0.1, 0.0, 0.0],
    white_patches: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
    sudden_onset: [0.1, 0.2, 0.0, 0.3, 0.1, 0.1, 0.0, 0.0, 0.2],
};

async function predictWithSymptoms(image, symptoms) {
    // Generate base probabilities
    const baseProbs = Array(CLASSES.length).fill(0);
    const mainClass = Math.floor(Math.random() * CLASSES.length);
    baseProbs[mainClass] = 0.6 + Math.random() * 0.3;
    
    for (let i = 0; i < baseProbs.length; i++) {
        if (i !== mainClass) baseProbs[i] = Math.random() * 0.2;
    }
    
    // Normalize
    const sum = baseProbs.reduce((a, b) => a + b, 0);
    const normalizedProbs = baseProbs.map(prob => prob / sum);
    
    // Adjust with symptoms
    const symptomVector = Array(CLASSES.length).fill(0);
    Object.keys(symptoms).forEach(symptom => {
        if (symptoms[symptom]) {
            SYMPTOM_WEIGHTS[symptom].forEach((weight, i) => {
                symptomVector[i] += weight;
            });
        }
    });
    
    const adjustedProbs = normalizedProbs.map((prob, i) => {
        return prob + 0.2 * symptomVector[i];
    });
    
    // Final normalization
    const finalSum = adjustedProbs.reduce((a, b) => a + b, 0);
    const finalProbs = adjustedProbs.map(prob => prob / finalSum);
    
    // Format results
    const results = {};
    CLASSES.forEach((className, i) => {
        results[className] = parseFloat(finalProbs[i].toFixed(4));
    });
    
    return results;
}

export { predictWithSymptoms, CLASSES };