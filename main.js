document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const excelInput = document.getElementById('excelInput');
    const excelDropzone = document.getElementById('excelDropzone');
    const excelFileInfo = document.getElementById('excelFileInfo');
    
    const singleImageInput = document.getElementById('singleImageInput');
    const singleImageDropzone = document.getElementById('singleImageDropzone');
    const singleImagePreview = document.getElementById('singleImagePreview');
    
    const batchImageInput = document.getElementById('batchImageInput');
    const batchImageDropzone = document.getElementById('batchImageDropzone');
    const batchCount = document.getElementById('batchCount');
    const batchPreview = document.getElementById('batchPreview');
    const batchForm = document.getElementById('batchForm');
    
    const notificationContainer = document.getElementById('notificationContainer');

    // Manejar el arrastrar y soltar para Excel
    setupDragAndDrop(excelDropzone, excelInput, (file) => {
        updateFileInfo(file, excelFileInfo);
    });

    excelInput.addEventListener('change', () => {
        if (excelInput.files.length) {
            updateFileInfo(excelInput.files[0], excelFileInfo);
        }
    });

    // Manejar el arrastrar y soltar para imagen individual
    setupDragAndDrop(singleImageDropzone, singleImageInput, (file) => {
        showImagePreview(file, singleImagePreview);
    });

    singleImageInput.addEventListener('change', () => {
        if (singleImageInput.files.length) {
            showImagePreview(singleImageInput.files[0], singleImagePreview);
        }
    });

    // Manejar el arrastrar y soltar para imágenes por lotes
    setupDragAndDrop(batchImageDropzone, batchImageInput, () => {
        updateBatchInfo();
    });

    batchImageInput.addEventListener('change', updateBatchInfo);

    // Función genérica para configurar drag and drop
    function setupDragAndDrop(dropzone, inputElement, callback) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                inputElement.files = e.dataTransfer.files;
                if (callback) callback(inputElement.files[0]);
            }
        });
    }

    // Función para mostrar información del archivo
    function updateFileInfo(file, container) {
        if (!file) return;
        
        container.innerHTML = `
            <p><strong>Archivo:</strong> ${file.name}</p>
            <p><strong>Tamaño:</strong> ${formatFileSize(file.size)}</p>
            <p><strong>Tipo:</strong> ${file.type || 'Desconocido'}</p>
        `;
    }

    // Función para mostrar vista previa de imagen
    function showImagePreview(file, container) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            container.innerHTML = `
                <img src="${e.target.result}" alt="Vista previa">
                <p class="file-info">${file.name} (${formatFileSize(file.size)})</p>
            `;
        };
        reader.readAsDataURL(file);
    }

    // Función para actualizar información del lote
    function updateBatchInfo() {
        const files = batchImageInput.files;
        batchCount.textContent = `${files.length} archivo(s) seleccionado(s)`;
        
        batchPreview.innerHTML = '';
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'batch-image-container';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Vista previa';
                
                const info = document.createElement('p');
                info.className = 'file-info';
                info.textContent = `${file.name.substring(0, 15)}... (${formatFileSize(file.size)})`;
                
                imgContainer.appendChild(img);
                imgContainer.appendChild(info);
                batchPreview.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        });
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            ${message}
        `;
        
        notificationContainer.appendChild(notification);
        
        // Eliminar la notificación después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 150000);
    }

    // Función para formatear el tamaño del archivo
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Manejar el envío de formularios
    document.querySelectorAll('.upload-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = this.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            
            try {
                // Mostrar estado de carga
                submitButton.disabled = true;
                submitButton.textContent = 'Subiendo...';
                
                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData
                });

                // Manejar la respuesta del servidor
                let result;
                try {
                    const text = await response.text();
                    try {
                        // Intentar parsear como JSON
                        result = JSON.parse(text);
                    } catch {
                        // Si no es JSON, usar el texto como mensaje
                        result = {
                            success: response.ok,
                            message: text || (response.ok ? 'Archivo subido correctamente' : 'Error en el servidor')
                        };
                    }
                } catch (error) {
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                if (!response.ok || (result.success === false)) {
                    throw new Error(result.message || result.error || 'Error en la subida');
                }

                showNotification(result.message || 'Archivo(s) subido(s) correctamente');
                
                // Actualizar vistas previas para lotes
                if (this.id === 'batchForm') {
                    batchPreview.querySelectorAll('.batch-image-container').forEach(container => {
                        container.style.border = '2px solid #4cc9f0';
                    });
                }
            } catch (error) {
                console.error('Error en la subida:', error);
                showNotification(error.message || 'Error al subir el archivo', 'error');
                
                if (this.id === 'batchForm') {
                    batchPreview.querySelectorAll('.batch-image-container').forEach(container => {
                        container.style.border = '2px solid #f72585';
                    });
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    });
});
