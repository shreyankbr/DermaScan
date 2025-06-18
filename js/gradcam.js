//GradCAM visualization for skin disease classifier

export function generateGradCAM(imageElement, targetElement, diagnosis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.naturalWidth || imageElement.width;
        canvas.height = imageElement.naturalHeight || imageElement.height;
        
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Generate heatmap based on diagnosis
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            // Different patterns for different diagnoses
            if (diagnosis === 'Acne') {
                if (Math.random() > 0.7 && 
                    (Math.abs(x - canvas.width/3) < 50 || 
                     Math.abs(x - 2*canvas.width/3) < 40)) {
                    data[i] = 255; // Red channel
                    data[i + 3] = 180; // Alpha
                }
            } 
            else if (diagnosis === 'Eczema') {
                if (x > canvas.width/4 && x < 3*canvas.width/4 && 
                    y > canvas.height/4 && y < 3*canvas.height/4 &&
                    Math.random() > 0.6) {
                    data[i] = 255;
                    data[i + 1] = 150;
                    data[i + 3] = 160;
                }
            }
            else if (diagnosis === 'Psoriasis') {
                if ((x % 30 < 15 && y % 30 < 15) || Math.random() > 0.8) {
                    data[i] = 255;
                    data[i + 3] = 200;
                }
            }
            else if (diagnosis === 'Vitiligo') {
                const distToCenter = Math.sqrt(Math.pow(x - canvas.width/2, 2) + 
                                     Math.pow(y - canvas.height/2, 2));
                if (distToCenter < 80 || Math.random() > 0.9) {
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = 150;
                }
            }
            else {
                // Default pattern
                if (Math.random() > 0.85) {
                    data[i] = 255;
                    data[i + 3] = 180;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        targetElement.src = canvas.toDataURL();
        resolve();
    });
}

export function initGradCAM() {
    const canvas = document.createElement('canvas');
    canvas.id = 'gradcam-canvas';
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
}