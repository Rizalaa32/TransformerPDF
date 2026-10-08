// Module 1: Word to PDF (via Local Backend)

export function initWordToPdf() {
    console.log("Word to PDF module initialized (Local Backend Mode).");
    
    let currentFile = null;

    const uploadArea = document.getElementById('w2p-upload-area');
    const fileInput = document.getElementById('w2p-file-input');
    const workspace = document.getElementById('w2p-workspace');
    const filenameDisplay = document.getElementById('w2p-filename');
    const changeFileBtn = document.getElementById('w2p-change-file-btn');
    const actionBtn = document.getElementById('w2p-action-btn');
    const statusMsg = document.getElementById('w2p-status');

    // -- File Selection --
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
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
        fileInput.value = ''; // Reset
    });

    changeFileBtn.addEventListener('click', () => {
        currentFile = null;
        workspace.classList.add('hidden');
        uploadArea.classList.remove('hidden');
        statusMsg.classList.add('hidden');
    });

    function handleFile(file) {
        if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
            alert('Tolong pilih file dokumen Word (.docx atau .doc).');
            return;
        }

        currentFile = file;
        filenameDisplay.textContent = file.name;
        uploadArea.classList.add('hidden');
        workspace.classList.remove('hidden');
        statusMsg.classList.add('hidden');
    }

    // -- Convert to PDF via Local Backend --
    actionBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Update UI state
        actionBtn.disabled = true;
        const originalBtnHTML = actionBtn.innerHTML;
        actionBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Memproses via Word Lokal...</span>
        `;
        
        statusMsg.classList.remove('hidden');
        statusMsg.textContent = "Mengunggah dan mengonversi menggunakan MS Word (harap tunggu)...";
        statusMsg.className = "text-center mt-4 text-sm text-blue-600 font-medium animate-pulse";
        
        try {
            const formData = new FormData();
            formData.append('file', currentFile);
            
            // Local FastAPI endpoint
            const response = await fetch('/api/convert/word2pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Gagal mengonversi file di server.");
            }
            
            statusMsg.textContent = "Berhasil! Mengunduh PDF...";
            statusMsg.className = "text-center mt-4 text-sm text-green-600 font-medium";
            
            // The response is directly the PDF file blob
            const blob = await response.blob();
            const originalName = currentFile.name.replace(/\.docx?$/, '');
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${originalName}_Converted.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Server Error:", error);
            statusMsg.textContent = `Error: ${error.message}`;
            statusMsg.className = "text-center mt-4 text-sm text-red-600 font-medium";
            alert("Terjadi kesalahan: " + error.message);
        } finally {
            // Restore UI
            actionBtn.disabled = false;
            actionBtn.innerHTML = originalBtnHTML;
        }
    });
}
