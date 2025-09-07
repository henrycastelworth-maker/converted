/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Essential for canvas operations with external/data URLs
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 60)}...`));
        img.src = src;
    });
}

/**
 * Creates a single "photo album" page from a collection of generated images.
 * @param images An array of image data URLs.
 * @returns A promise that resolves to a data URL of the generated album page (JPEG format).
 */
export async function createAlbumPage(images: string[]): Promise<string> {
    const canvas = document.createElement('canvas');
    // High-resolution canvas for good quality (A4-like ratio)
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Draw the background
    ctx.fillStyle = '#1a1a1a'; // A dark, sophisticated background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the title
    ctx.fillStyle = '#e5e5e5'; // Light gray text
    ctx.textAlign = 'center';

    ctx.font = `bold 120px 'Caveat', cursive`;
    ctx.fillText('Mi Álbum Virtual', canvasWidth / 2, 180);

    ctx.font = `50px 'Roboto', sans-serif`;
    ctx.fillStyle = '#a3a3a3'; // Medium gray subtext
    ctx.fillText('Creado con el Probador Virtual de IA', canvasWidth / 2, 260);


    // 3. Load all the result images concurrently
    const loadedImages = await Promise.all(
        images.map(url => loadImage(url))
    );

    // 4. Define grid layout and draw each image
    const grid = { cols: 2, padding: 80 };
    const contentTopMargin = 350; // Space for the header
    const contentWidth = canvasWidth - grid.padding * 2;
    const cellWidth = (contentWidth - grid.padding * (grid.cols - 1)) / grid.cols;
    const rows = Math.ceil(loadedImages.length / grid.cols);
    
    loadedImages.forEach((img, index) => {
        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        // Calculate image dimensions to fit while maintaining aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const drawWidth = cellWidth;
        const drawHeight = drawWidth / aspectRatio;
        
        const cellHeight = drawHeight; // Dynamic cell height based on image

        // Calculate total height of previous rows to determine current Y offset
        let yOffset = contentTopMargin + grid.padding;
        for(let i = 0; i < row; i++) {
            const imageInPrevRowIndex = i * grid.cols;
            const prevImg = loadedImages[imageInPrevRowIndex];
            yOffset += (cellWidth / (prevImg.naturalWidth / prevImg.naturalHeight)) + grid.padding;
        }

        const x = grid.padding + col * (cellWidth + grid.padding);
        const y = yOffset;

        ctx.save();
        
        // Draw a soft shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;
        
        // Draw the image
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        // Draw a subtle border on top of the image
        ctx.shadowColor = 'transparent'; // Reset shadow for the border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, drawWidth, drawHeight);
        
        ctx.restore(); // Restore context to pre-transformation state
    });

    // Convert canvas to a high-quality JPEG and return the data URL
    return canvas.toDataURL('image/jpeg', 0.92);
}
