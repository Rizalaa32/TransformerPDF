// Module 2: PDF Merger

export function initMerger() {
    console.log("PDF Merger module initialized.");
    
    let selectedFiles = [];

    const uploadArea = document.getElementById('merge-upload-area');
    const fileInput = document.getElementById('merge-file-input');
    const listContainer = document.getElementById('merge-list-container');
    const fileList = document.getElementById('merge-file-list');
    const clearBtn = document.getElementById('merge-clear-btn');
    const actionBtn = document.getElementById('merge-action-btn');
    const statusMsg = document.getElementById('merge-status');

    // -- File Selection Logic --
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
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
        fileInput.value = ''; // Reset input
    });

    function handleFiles(files) {
        const newFiles = Array.from(files).filter(f => f.type === 'application/pdf');
        
        if (newFiles.length === 0) {
            alert('Tolong pilih file PDF.');
            return;
        }

        selectedFiles = [...selectedFiles, ...newFiles];
        renderFileList();
        updateUI();
    }

    // -- UI Rendering & Drag-and-Drop Reordering --
    let draggedItemIndex = null;

    function renderFileList() {
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'px-4 py-3 flex items-center justify-between bg-white cursor-move hover:bg-slate-50 transition-colors group';
            li.draggable = true;
            li.dataset.index = index;

            li.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>
                    <span class="text-sm font-medium text-slate-700 truncate">${file.name}</span>
                    <span class="text-xs text-slate-400 ml-2">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button class="delete-btn text-slate-400 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100" data-index="${index}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;

            // HTML5 Drag and Drop events for reordering
            li.addEventListener('dragstart', (e) => {
                draggedItemIndex = index;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => li.classList.add('opacity-50'), 0);
            });

            li.addEventListener('dragend', () => {
                draggedItemIndex = null;
                li.classList.remove('opacity-50');
                document.querySelectorAll('.border-t-2', '.border-b-2').forEach(el => {
                    el.classList.remove('border-t-2', 'border-primary', 'border-b-2');
                });
            });

            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                const hoverIndex = index;
                if (draggedItemIndex === hoverIndex) return;

                const bounding = li.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                
                // Add visual cue based on cursor position relative to item center
                if (e.clientY - offset > 0) {
                    li.classList.add('border-b-2', 'border-primary');
                    li.classList.remove('border-t-2');
                } else {
                    li.classList.add('border-t-2', 'border-primary');
                    li.classList.remove('border-b-2');
                }
            });

            li.addEventListener('dragleave', () => {
                li.classList.remove('border-t-2', 'border-primary', 'border-b-2');
            });

            li.addEventListener('drop', (e) => {
                e.preventDefault();
                li.classList.remove('border-t-2', 'border-primary', 'border-b-2');
                const dropIndex = index;
                if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

                // Reorder array
                const item = selectedFiles.splice(draggedItemIndex, 1)[0];
                
                const bounding = li.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                
                let targetIndex = dropIndex;
                if (e.clientY - offset > 0) {
                    // Dropped below center
                    targetIndex = draggedItemIndex < dropIndex ? dropIndex : dropIndex + 1;
                } else {
                    // Dropped above center
                    targetIndex = draggedItemIndex < dropIndex ? dropIndex - 1 : dropIndex;
                }
                
                selectedFiles.splice(targetIndex, 0, item);
                renderFileList();
            });

            fileList.appendChild(li);
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.index);
                selectedFiles.splice(idx, 1);
                renderFileList();
                updateUI();
            });
        });
    }

    function updateUI() {
        if (selectedFiles.length > 0) {
            listContainer.classList.remove('hidden');
        } else {
            listContainer.classList.add('hidden');
        }
        
        // Need at least 2 files to merge
        actionBtn.disabled = selectedFiles.length < 2;
        statusMsg.classList.add('hidden');
    }

    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        renderFileList();
        updateUI();
    });

    // -- PDF Processing Logic --
    actionBtn.addEventListener('click', async () => {
        if (selectedFiles.length < 2) return;

        try {
            // Update UI State
            actionBtn.disabled = true;
            actionBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Memproses...</span>
            `;
            statusMsg.classList.remove('hidden');
            statusMsg.textContent = "Membaca file PDF...";
            statusMsg.className = "mt-3 text-sm text-blue-600";

            const { PDFDocument } = window.PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (let i = 0; i < selectedFiles.length; i++) {
                statusMsg.textContent = `Menggabungkan dokumen ${i + 1} dari ${selectedFiles.length}...`;
                
                const file = selectedFiles[i];
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pageIndices = pdfDoc.getPageIndices();
                
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach((page) => {
                    mergedPdf.addPage(page);
                });
            }

            statusMsg.textContent = "Menyimpan file hasil gabungan...";
            const pdfBytes = await mergedPdf.save();
            
            // Trigger download
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TransformPDF_Merged_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMsg.textContent = "Selesai! PDF berhasil diunduh.";
            statusMsg.className = "mt-3 text-sm text-green-600 font-medium";

        } catch (error) {
            console.error("Error merging PDFs:", error);
            statusMsg.textContent = "Terjadi kesalahan saat menggabungkan PDF.";
            statusMsg.className = "mt-3 text-sm text-red-600 font-medium";
        } finally {
            // Restore UI
            actionBtn.disabled = false;
            actionBtn.innerHTML = '<span>Gabungkan PDF</span>';
        }
    });
}
