// Simple SHA-256 implementation for hashing
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Block class
class Block {
    constructor(index, timestamp, data, previousHash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = '';
        this.nonce = 0;
    }

    async calculateHash() {
        const data = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
        return await sha256(data);
    }

    async mineBlock(difficulty) {
        const target = Array(difficulty + 1).join("0");
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = await this.calculateHash();
        }
        
        console.log(`Block mined: ${this.hash}`);
    }
}

// Blockchain class
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
    }

    createGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), {
            type: 'genesis',
            message: 'Genesis Block - Document Blockchain Initialized'
        }, '0');
        
        // Set genesis block hash synchronously for initial display
        genesisBlock.hash = 'genesis';
        return genesisBlock;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    async addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        await newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
    }

    async isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== await currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

// Initialize blockchain
const docBlockchain = new Blockchain();

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const validateBtn = document.getElementById('validateBtn');
const selectedFile = document.getElementById('selectedFile');
const statusMessage = document.getElementById('statusMessage');
const totalBlocks = document.getElementById('totalBlocks');
const totalDocuments = document.getElementById('totalDocuments');
const chainStatus = document.getElementById('chainStatus');
const blocksContainer = document.getElementById('blocksContainer');

// File selection handler
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFile.style.display = 'block';
        selectedFile.innerHTML = `<strong>Selected:</strong> ${file.name} (${formatFileSize(file.size)})`;
        uploadBtn.disabled = false;
    } else {
        selectedFile.style.display = 'none';
        uploadBtn.disabled = true;
    }
});

// Upload button handler
uploadBtn.addEventListener('click', async function() {
    const file = fileInput.files[0];
    if (!file) return;

    showStatus('Processing document...', 'info');
    uploadBtn.disabled = true;

    try {
        const content = await readFileContent(file);
        
        const documentData = {
            type: 'document',
            filename: file.name,
            size: file.size,
            content: content,
            uploadedAt: new Date().toISOString()
        };

        const newBlock = new Block(
            docBlockchain.chain.length,
            Date.now(),
            documentData,
            docBlockchain.getLatestBlock().hash
        );

        await docBlockchain.addBlock(newBlock);
        
        showStatus(`Document "${file.name}" successfully added to blockchain!`, 'success');
        updateUI();
        
        // Reset form
        fileInput.value = '';
        selectedFile.style.display = 'none';
        uploadBtn.disabled = true;

    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        uploadBtn.disabled = false;
    }
});

// Validate button handler
validateBtn.addEventListener('click', async function() {
    showStatus('Validating blockchain...', 'info');
    
    const isValid = await docBlockchain.isChainValid();
    
    if (isValid) {
        showStatus('Blockchain is valid! ✅', 'success');
        chainStatus.textContent = 'Valid ✅';
    } else {
        showStatus('Blockchain validation failed! ❌', 'error');
        chainStatus.textContent = 'Invalid ❌';
    }
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
});

// Helper functions
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

function updateUI() {
    totalBlocks.textContent = docBlockchain.chain.length;
    totalDocuments.textContent = docBlockchain.chain.length - 1; // Exclude genesis block
    renderBlocks();
}

function renderBlocks() {
    blocksContainer.innerHTML = '';
    
    docBlockchain.chain.slice().reverse().forEach((block, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = `block ${block.index === 0 ? 'genesis-block' : ''}`;
        
        const timestamp = new Date(block.timestamp).toLocaleString();
        const isGenesis = block.data.type === 'genesis';
        
        blockElement.innerHTML = `
            <div class="block-header">
                <div class="block-index">Block #${block.index}</div>
                <div class="block-timestamp">${timestamp}</div>
            </div>
            <div class="block-hash">
                <strong>Hash:</strong> ${block.hash}
            </div>
            ${block.previousHash !== '0' ? `<div class="block-hash">
                <strong>Previous Hash:</strong> ${block.previousHash}
            </div>` : ''}
            ${isGenesis ? `
                <div class="document-info">
                    <div class="document-name">🏗️ ${block.data.message}</div>
                </div>
            ` : `
                <div class="document-info">
                    <div class="document-name">📄 ${block.data.filename}</div>
                    <div class="document-size">Size: ${formatFileSize(block.data.size)} | Uploaded: ${new Date(block.data.uploadedAt).toLocaleString()}</div>
                </div>
                <div class="document-content">${block.data.content}</div>
            `}
        `;
        
        blocksContainer.appendChild(blockElement);
    });
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
});
