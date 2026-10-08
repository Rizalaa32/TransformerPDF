// Module 3: PDF Page Manager

export function initPageManager() {
    console.log("PDF Page Manager module initialized.");

    // Configure PDF.js worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let sourceDocs = []; // Array of { id, name, bytes }
    let nextDocId = 1;

    const uploadArea = document.getElementById('org-upload-area');
    const fileInput = document.getElementById('org-file-input');
    const workspace = document.getElementById('org-workspace');
    const filenameDisplay = document.getElementById('org-filename');
    const changeFileBtn = document.getElementById('org-change-file-btn');
    const addPdfBtn = document.getElementById('org-add-pdf-btn');
    const addFileInput = document.getElementById('org-add-file-input');
    const actionBtn = document.getElementById('org-action-btn');
    const statusMsg = document.getElementById('org-status');
    const grid = document.getElementById('org-thumbnails-grid');
    const pageCountDisplay = document.getElementById('org-page-count');

    // -- File Selection (Initial) --
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-primary', 'bg-blue-50');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-primary', 'bg-blue-50');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-primary', 'bg-blue-50');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0], true);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0], true);
        }
        fileInput.value = '';
    });

    // -- Add Additional Files --
    if (addPdfBtn && addFileInput) {
        addPdfBtn.addEventListener('click', () => addFileInput.click());
        
        addFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length) {
                for (let file of e.target.files) {
                    await handleFile(file, false);
                }
            }
            addFileInput.value = '';
        });
    }

    changeFileBtn.addEventListener('click', () => {
        sourceDocs = [];
        nextDocId = 1;
        workspace.classList.add('hidden');
        uploadArea.classList.remove('hidden');
        statusMsg.classList.add('hidden');
        grid.innerHTML = '';
    });

    async function handleFile(file, isFirst = true) {
        if (file.type !== 'application/pdf') {
            alert('Tolong pilih file PDF.');
            return;
        }

        if (isFirst) {
            sourceDocs = [];
            nextDocId = 1;
            filenameDisplay.textContent = file.name;
            uploadArea.classList.add('hidden');
            workspace.classList.remove('hidden');
            grid.innerHTML = '';
        } else {
            filenameDisplay.textContent = `Multiple PDFs (${sourceDocs.length + 1})`;
        }
        
        statusMsg.classList.remove('hidden');
        statusMsg.textContent = "Memuat halaman PDF...";
        statusMsg.className = "text-center mb-6 text-sm text-blue-600";
        actionBtn.disabled = true;

        try {
            const bytes = await file.arrayBuffer();
            const docId = nextDocId++;
            // Clone the ArrayBuffer because pdf.js might detach/consume the original buffer
            sourceDocs.push({ id: docId, name: file.name, bytes: bytes.slice(0) });

            const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;
            
            const numPages = pdf.numPages;

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                renderThumbnail(page, i, docId, file.name);
            }

            updatePageOrder();
            statusMsg.classList.add('hidden');
        } catch (err) {
            console.error("Error loading PDF:", err);
            statusMsg.textContent = "Gagal memuat PDF. Pastikan file tidak rusak atau dilindungi sandi.";
            statusMsg.className = "text-center mb-6 text-sm text-red-600 font-medium";
        }
    }

    // -- Thumbnail Rendering & Drag/Drop --
    let draggedThumbIndex = null;

    async function renderThumbnail(page, pageNum, sourceId, fileName) {
        // Create container
        const container = document.createElement('div');
        container.className = 'relative bg-white p-2 rounded-lg shadow-sm border border-slate-200 cursor-move group hover:shadow-md hover:border-primary transition-all flex flex-col';
        container.draggable = true;
        container.dataset.originalPage = pageNum;
        container.dataset.sourceId = sourceId;

        // Render Canvas
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = 150 / viewport.width; // fit width to 150px roughly
        const scaledViewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.className = 'w-full h-auto border border-slate-100 mb-2 pointer-events-none flex-grow';

        container.appendChild(canvas);

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        page.render(renderContext);

        // Page Number Label
        const pageLabel = document.createElement('div');
        pageLabel.className = 'text-center text-xs font-medium text-slate-500 pointer-events-none mt-1';
        pageLabel.textContent = `Halaman ${pageNum}`;
        container.appendChild(pageLabel);

        // File Source Label
        const fileLabel = document.createElement('div');
        fileLabel.className = 'text-center text-[10px] text-slate-400 pointer-events-none truncate px-1 mt-0.5';
        fileLabel.textContent = fileName;
        fileLabel.title = fileName;
        container.appendChild(fileLabel);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100';
        deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        deleteBtn.title = 'Hapus Halaman';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.remove();
            updatePageOrder();
        });

        container.appendChild(deleteBtn);

        // Drag and drop events for grid items
        container.addEventListener('dragstart', (e) => {
            draggedThumbIndex = getDOMIndex(container);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => container.classList.add('opacity-50', 'scale-95'), 0);
        });

        container.addEventListener('dragend', () => {
            draggedThumbIndex = null;
            container.classList.remove('opacity-50', 'scale-95');
            document.querySelectorAll('.border-l-4').forEach(el => el.classList.remove('border-l-4', 'border-primary', 'pl-1'));
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const hoverIndex = getDOMIndex(container);
            if (draggedThumbIndex === hoverIndex) return;
            
            // Visual cue
            container.classList.add('border-l-4', 'border-primary', 'pl-1');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('border-l-4', 'border-primary', 'pl-1');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('border-l-4', 'border-primary', 'pl-1');
            
            const dropIndex = getDOMIndex(container);
            if (draggedThumbIndex === null || draggedThumbIndex === dropIndex) return;

            const allThumbs = Array.from(grid.children);
            const draggedEl = allThumbs[draggedThumbIndex];
            
            // Move DOM element
            if (draggedThumbIndex < dropIndex) {
                grid.insertBefore(draggedEl, container.nextSibling);
            } else {
                grid.insertBefore(draggedEl, container);
            }
            
            updatePageOrder();
        });

        grid.appendChild(container);
    }

    function getDOMIndex(el) {
        return Array.from(grid.children).indexOf(el);
    }

    function updatePageOrder() {
        const remaining = grid.children.length;
        pageCountDisplay.textContent = `(${remaining} tersisa)`;
        
        // Update labels to show new logical page number
        Array.from(grid.children).forEach((child, idx) => {
            const label = child.querySelector('.text-slate-500');
            if (label) {
                label.textContent = `Halaman ${idx + 1}`;
            }
        });

        if (remaining === 0) {
            actionBtn.disabled = true;
        } else {
            actionBtn.disabled = false;
        }
    }

    // -- Process and Save --
    actionBtn.addEventListener('click', async () => {
        const thumbnails = Array.from(grid.children);
        if (sourceDocs.length === 0 || thumbnails.length === 0) return;

        try {
            actionBtn.disabled = true;
            statusMsg.classList.remove('hidden');
            statusMsg.textContent = "Memproses halaman PDF...";
            statusMsg.className = "text-center mb-6 text-sm text-blue-600";

            const { PDFDocument } = window.PDFLib;
            const newPdf = await PDFDocument.create();

            // 1. Map sequence from the UI grid
            const sequence = thumbnails.map(thumb => ({
                srcId: parseInt(thumb.dataset.sourceId),
                pageNum: parseInt(thumb.dataset.originalPage) - 1 // pdf-lib pages are 0-indexed
            }));

            // 2. Group pages by source document to optimize copyPages (prevents massive file bloat)
            const pagesBySource = {};
            sequence.forEach((item, index) => {
                if (!pagesBySource[item.srcId]) {
                    pagesBySource[item.srcId] = {
                        indices: [],
                        sequencePositions: []
                    };
                }
                pagesBySource[item.srcId].indices.push(item.pageNum);
                pagesBySource[item.srcId].sequencePositions.push(index);
            });

            // 3. Array to hold the final copied pages in correct order
            const finalPages = new Array(sequence.length);

            // 4. Load and copy pages efficiently
            for (const src of sourceDocs) {
                if (!pagesBySource[src.id]) continue; // Skip if no pages from this doc

                const pdfDoc = await PDFDocument.load(src.bytes);
                const req = pagesBySource[src.id];
                
                // Copy all needed pages from this source in one single call
                const copiedPages = await newPdf.copyPages(pdfDoc, req.indices);
                
                // Place them in the finalPages array at their target sequence positions
                copiedPages.forEach((copiedPage, i) => {
                    const finalIndex = req.sequencePositions[i];
                    finalPages[finalIndex] = copiedPage;
                });
            }

            // 5. Add pages to the new document in the correct order
            finalPages.forEach(page => {
                newPdf.addPage(page);
            });

            statusMsg.textContent = "Menyimpan file...";
            const pdfBytes = await newPdf.save();

            // Download
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const originalName = sourceDocs[0].name.replace('.pdf', '');
            a.download = `${originalName}_Organized.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMsg.textContent = "Berhasil disimpan!";
            statusMsg.className = "text-center mb-6 text-sm text-green-600 font-medium";

        } catch (error) {
            console.error("Error saving organized PDF:", error);
            statusMsg.textContent = "Terjadi kesalahan saat menyimpan PDF.";
            statusMsg.className = "text-center mb-6 text-sm text-red-600 font-medium";
        } finally {
            actionBtn.disabled = false;
        }
    });
}
