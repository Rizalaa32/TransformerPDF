import os
import shutil
import tempfile
import threading
import queue
import asyncio
import pythoncom
import win32com.client
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

TEMP_DIR = tempfile.gettempdir()

# Queue to handle conversion tasks
# Task format: (input_path, output_path, result_event, result_dict)
conversion_queue = queue.Queue()

def word_worker():
    """
    Background worker thread that keeps a Microsoft Word COM instance alive.
    This eliminates the startup and teardown time of opening MS Word for each file.
    """
    # Initialize COM in this thread
    pythoncom.CoInitialize()
    
    try:
        # Open MS Word invisibly
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False  # Optimization: Disable alerts/prompts
        
        try:
            word.ScreenUpdating = False  # Optimization: Disable UI updates
        except:
            pass
        
        while True:
            task = conversion_queue.get()
            if task is None:
                # Stop signal
                break
                
            in_path, out_path, result_event, result_dict = task
            try:
                # Absolute paths are required for COM
                in_path_abs = os.path.abspath(in_path)
                out_path_abs = os.path.abspath(out_path)
                
                # Open read-only to avoid file locks and speed up loading
                doc = word.Documents.Open(in_path_abs, ReadOnly=True, Visible=False)
                
                # ExportAsFixedFormat is specifically optimized for PDF output
                doc.ExportAsFixedFormat(OutputFileName=out_path_abs, ExportFormat=17)
                
                # wdDoNotSaveChanges = 0, prevents save prompts
                doc.Close(SaveChanges=0)
                
                result_dict['status'] = 'success'
            except Exception as e:
                result_dict['status'] = 'error'
                result_dict['error'] = str(e)
            finally:
                # Notify the waiting FastAPI endpoint
                result_event.set()
                conversion_queue.task_done()
                
    except Exception as e:
        print(f"COM Worker Error: {e}")
    finally:
        try:
            word.Quit()
        except:
            pass
        pythoncom.CoUninitialize()

# Start dedicated COM worker threads when FastAPI starts
# Use multiple workers (up to 4) to handle concurrent conversions
NUM_WORKERS = min(4, max(1, (os.cpu_count() or 2) - 1))
for _ in range(NUM_WORKERS):
    worker_thread = threading.Thread(target=word_worker, daemon=True)
    worker_thread.start()


@app.post("/api/convert/word2pdf")
async def convert_word_to_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith((".docx", ".doc")):
        raise HTTPException(status_code=400, detail="Hanya file .docx atau .doc yang didukung.")
    
    # Save the uploaded file to a temporary location
    input_path = os.path.join(TEMP_DIR, file.filename)
    output_path = os.path.join(TEMP_DIR, file.filename.rsplit(".", 1)[0] + ".pdf")
    
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Dispatch the task to the COM worker thread
        result_event = threading.Event()
        result_dict = {}
        conversion_queue.put((input_path, output_path, result_event, result_dict))
        
        # Wait non-blockingly for the thread to finish
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, result_event.wait)
        
        if result_dict.get('status') == 'error':
            raise Exception(result_dict.get('error', 'Konversi gagal pada engine lokal.'))
            
        # Return the PDF file
        if not os.path.exists(output_path):
            raise Exception("File PDF gagal dibuat.")
            
        return FileResponse(
            path=output_path,
            filename=os.path.basename(output_path),
            media_type="application/pdf",
            background=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Note: input file cleanup is immediate.
        # Output file remains in temp folder until OS clears it.
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except:
                pass

# Mount the public directory to serve index.html and static assets
app.mount("/", StaticFiles(directory="public", html=True), name="public")
