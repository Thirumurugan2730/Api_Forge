const roleMatrixRunner = require('../roles/roleMatrixRunner');
/**
 * ApiForge Lite — Spring Edition
 * Local Collections & Folders Storage Service (Step 3)
 *
 * Implements atomic writes, path traversal prevention, corruption recovery,
 * and complete CRUD operations for Collections, Folders, and Requests.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { app } = require('electron');

let storageDir = null;

/**
 * Initializes the storage directory.
 * Defaults to app.getPath('userData')/collections or uses a custom directory.
 *
 * @param {string} [customDir]
 * @returns {string} The active storage directory.
 */
function initStorage(customDir) {
  if (customDir) {
    storageDir = path.resolve(customDir);
  } else if (!storageDir) {
    const userData = app ? app.getPath('userData') : process.cwd();
    storageDir = path.resolve(userData, 'collections');
  }

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  return storageDir;
}

function getStorageDir() {
  if (!storageDir) {
    initStorage();
  }
  return storageDir;
}

// ============================================================================
// Security & Validation Helpers
// ============================================================================

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(id, label = 'Identifier') {
  if (!id || typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${label}: must be an alphanumeric string without spaces or path separators`);
  }
  return id;
}

function sanitizeName(name, label = 'Name') {
  if (typeof name !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = name.trim().replace(/[\x00-\x1F\x7F]/g, '');
  if (!trimmed) {
    throw new Error(`${label} cannot be empty`);
  }
  if (trimmed.length > 128) {
    throw new Error(`${label} cannot exceed 128 characters`);
  }
  return trimmed;
}

function assertSafePath(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error(`Path traversal attempt detected: "${targetPath}" is outside "${baseDir}"`);
  }
  return resolvedTarget;
}

// ============================================================================
// Atomic File Operations & Resilience
// ============================================================================

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(data, null, 2);

  fs.writeFileSync(tempPath, serialized, 'utf8');

  try {
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Windows file replacement fallback
    if (err.code === 'EEXIST' || err.code === 'EPERM') {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
      fs.renameSync(tempPath, filePath);
    } else {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
      throw err;
    }
  }
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const clean = raw.trim().replace(/^\uFEFF/, '');
    if (!clean) return null;
    return JSON.parse(clean);
  } catch (err) {
    console.warn(`[Storage] Warning: Failed to parse JSON from "${filePath}":`, err.message);
    return null; // Graceful recovery from corrupted files
  }
}

// ============================================================================
// Path Resolvers
// ============================================================================

function getCollectionDir(collectionId) {
  const base = getStorageDir();
  const safeId = sanitizeId(collectionId, 'Collection ID');
  const dir = path.join(base, safeId);
  return assertSafePath(dir, base);
}

function getFoldersDir(collectionId) {
  const colDir = getCollectionDir(collectionId);
  const dir = path.join(colDir, 'folders');
  return assertSafePath(dir, colDir);
}

function getRequestsDir(collectionId) {
  const colDir = getCollectionDir(collectionId);
  const dir = path.join(colDir, 'requests');
  return assertSafePath(dir, colDir);
}

function getCollectionJsonPath(collectionId) {
  return path.join(getCollectionDir(collectionId), 'collection.json');
}

function getFolderJsonPath(collectionId, folderId) {
  const foldersDir = getFoldersDir(collectionId);
  const safeFolderId = sanitizeId(folderId, 'Folder ID');
  return path.join(foldersDir, `${safeFolderId}.json`);
}

function getRequestJsonPath(collectionId, requestId) {
  const requestsDir = getRequestsDir(collectionId);
  const safeRequestId = sanitizeId(requestId, 'Request ID');
  return path.join(requestsDir, `${safeRequestId}.json`);
}

// ============================================================================
// Core Storage Operations
// ============================================================================

/**
 * Builds and returns the hierarchical collections tree.
 *
 * @returns {Array<object>} List of collection trees with nested folders and requests.
 */
function getCollectionsTree() {
  const base = getStorageDir();
  if (!fs.existsSync(base)) return [];

  const entries = fs.readdirSync(base, { withFileTypes: true });
  const tree = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const colId = entry.name;
    const colJsonPath = path.join(base, colId, 'collection.json');
    const colMeta = safeReadJson(colJsonPath);

    if (!colMeta || colMeta.id !== colId) {
      continue; // Skip invalid or corrupted collection
    }

    // Read folders
    const foldersDir = path.join(base, colId, 'folders');
    const rawFolders = [];
    if (fs.existsSync(foldersDir)) {
      const folderFiles = fs.readdirSync(foldersDir);
      for (const fFile of folderFiles) {
        if (!fFile.endsWith('.json') || fFile.includes('.tmp')) continue;
        const fData = safeReadJson(path.join(foldersDir, fFile));
        if (fData && fData.id) {
          rawFolders.push({
            id: fData.id,
            name: fData.name,
            parentFolderId: fData.parentFolderId || null,
            createdAt: fData.createdAt || Date.now(),
            updatedAt: fData.updatedAt || Date.now(),
            folders: [],
            requests: []
          });
        }
      }
    }

    // Read requests
    const requestsDir = path.join(base, colId, 'requests');
    const rawRequests = [];
    if (fs.existsSync(requestsDir)) {
      const reqFiles = fs.readdirSync(requestsDir);
      for (const rFile of reqFiles) {
        if (!rFile.endsWith('.json') || rFile.includes('.tmp')) continue;
        const rData = safeReadJson(path.join(requestsDir, rFile));
        if (rData && rData.id) {
          rawRequests.push({
            id: rData.id,
            collectionId: colId,
            folderId: rData.folderId || null,
            name: rData.name || 'Untitled Request',
            method: rData.method || 'GET',
            url: rData.url || '',
            params: Array.isArray(rData.params) ? rData.params : [],
            headers: Array.isArray(rData.headers) ? rData.headers : [],
            body: rData.body || '',
            createdAt: rData.createdAt || Date.now(),
            updatedAt: rData.updatedAt || Date.now()
          });
        }
      }
    }

    // Assemble nested folder hierarchy
    const folderMap = new Map();
    rawFolders.forEach((f) => folderMap.set(f.id, f));

    // Distribute requests into folders or root
    const rootRequests = [];
    rawRequests.forEach((req) => {
      if (req.folderId && folderMap.has(req.folderId)) {
        folderMap.get(req.folderId).requests.push(req);
      } else {
        rootRequests.push(req);
      }
    });

    // Nest folders into parents
    const rootFolders = [];
    rawFolders.forEach((f) => {
      if (f.parentFolderId && folderMap.has(f.parentFolderId) && f.parentFolderId !== f.id) {
        folderMap.get(f.parentFolderId).folders.push(f);
      } else {
        rootFolders.push(f);
      }
    });

    // Sort folders & requests by name
    rootFolders.sort((a, b) => a.name.localeCompare(b.name));
    rootRequests.sort((a, b) => a.name.localeCompare(b.name));

    tree.push({
      id: colMeta.id,
      name: colMeta.name,
      createdAt: colMeta.createdAt || Date.now(),
      updatedAt: colMeta.updatedAt || Date.now(),
      folders: rootFolders,
      requests: rootRequests
    });
  }

  // Sort collections by name
  tree.sort((a, b) => a.name.localeCompare(b.name));
  return tree;
}

// ----------------------------------------------------------------------------
// Collection Operations
// ----------------------------------------------------------------------------

function createCollection(name) {
  const safeName = sanitizeName(name, 'Collection Name');
  const collectionId = `col_${Date.now()}_${randomUUID().slice(0, 6)}`;
  const colDir = getCollectionDir(collectionId);

  fs.mkdirSync(path.join(colDir, 'folders'), { recursive: true });
  fs.mkdirSync(path.join(colDir, 'requests'), { recursive: true });

  const metadata = {
    id: collectionId,
    name: safeName,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  atomicWriteJson(getCollectionJsonPath(collectionId), metadata);
  return { ...metadata, folders: [], requests: [] };
}

function renameCollection(collectionId, newName) {
  const safeName = sanitizeName(newName, 'Collection Name');
  const colJsonPath = getCollectionJsonPath(collectionId);
  const metadata = safeReadJson(colJsonPath);
  if (!metadata) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  metadata.name = safeName;
  metadata.updatedAt = Date.now();
  atomicWriteJson(colJsonPath, metadata);

  return metadata;
}

function deleteCollection(collectionId) {
  const colDir = getCollectionDir(collectionId);
  if (fs.existsSync(colDir)) {
    fs.rmSync(colDir, { recursive: true, force: true });
  }
  return { success: true, collectionId };
}

function duplicateCollection(collectionId) {
  const colJsonPath = getCollectionJsonPath(collectionId);
  const originalMeta = safeReadJson(colJsonPath);
  if (!originalMeta) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  const newCollection = createCollection(`${originalMeta.name} (Copy)`);
  const newColId = newCollection.id;

  // Duplicate folders
  const oldFoldersDir = getFoldersDir(collectionId);
  const folderIdMap = new Map(); // oldId -> newId

  if (fs.existsSync(oldFoldersDir)) {
    const fFiles = fs.readdirSync(oldFoldersDir);
    // First pass: create all new folder records
    for (const file of fFiles) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const f = safeReadJson(path.join(oldFoldersDir, file));
      if (!f || !f.id) continue;

      const newFolderId = `fld_${Date.now()}_${randomUUID().slice(0, 6)}`;
      folderIdMap.set(f.id, newFolderId);
    }

    // Second pass: save with mapped parentFolderId
    for (const file of fFiles) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const f = safeReadJson(path.join(oldFoldersDir, file));
      if (!f || !f.id) continue;

      const newFolderId = folderIdMap.get(f.id);
      const newParentId = f.parentFolderId ? folderIdMap.get(f.parentFolderId) || null : null;

      const newFolderData = {
        id: newFolderId,
        name: f.name,
        parentFolderId: newParentId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      atomicWriteJson(getFolderJsonPath(newColId, newFolderId), newFolderData);
    }
  }

  // Duplicate requests
  const oldRequestsDir = getRequestsDir(collectionId);
  if (fs.existsSync(oldRequestsDir)) {
    const rFiles = fs.readdirSync(oldRequestsDir);
    for (const file of rFiles) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const r = safeReadJson(path.join(oldRequestsDir, file));
      if (!r || !r.id) continue;

      const newFolderId = r.folderId ? folderIdMap.get(r.folderId) || null : null;
      saveRequest(newColId, newFolderId, {
        name: r.name,
        method: r.method,
        url: r.url,
        params: r.params,
        headers: r.headers,
        body: r.body,
        tests: r.tests ? JSON.parse(JSON.stringify(r.tests)) : []
      });
    }
  }

  return newCollection;
}

// ----------------------------------------------------------------------------
// Folder Operations
// ----------------------------------------------------------------------------

function createFolder(collectionId, parentFolderId, name) {
  const safeName = sanitizeName(name, 'Folder Name');
  getCollectionDir(collectionId); // Verify collection exists

  const folderId = `fld_${Date.now()}_${randomUUID().slice(0, 6)}`;
  let safeParentId = null;
  if (parentFolderId) {
    safeParentId = sanitizeId(parentFolderId, 'Parent Folder ID');
  }

  const folderData = {
    id: folderId,
    name: safeName,
    parentFolderId: safeParentId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  atomicWriteJson(getFolderJsonPath(collectionId, folderId), folderData);
  return { ...folderData, folders: [], requests: [] };
}

function renameFolder(collectionId, folderId, newName) {
  const safeName = sanitizeName(newName, 'Folder Name');
  const folderJsonPath = getFolderJsonPath(collectionId, folderId);
  const folderData = safeReadJson(folderJsonPath);
  if (!folderData) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  folderData.name = safeName;
  folderData.updatedAt = Date.now();
  atomicWriteJson(folderJsonPath, folderData);

  return folderData;
}

function deleteFolder(collectionId, folderId) {
  getCollectionDir(collectionId);
  const safeFolderId = sanitizeId(folderId, 'Folder ID');

  // Find all child folder IDs recursively
  const foldersDir = getFoldersDir(collectionId);
  const allFolders = [];
  if (fs.existsSync(foldersDir)) {
    const files = fs.readdirSync(foldersDir);
    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const f = safeReadJson(path.join(foldersDir, file));
      if (f && f.id) allFolders.push(f);
    }
  }

  const foldersToDelete = new Set([safeFolderId]);
  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    for (const f of allFolders) {
      if (f.parentFolderId && foldersToDelete.has(f.parentFolderId) && !foldersToDelete.has(f.id)) {
        foldersToDelete.add(f.id);
        addedNew = true;
      }
    }
  }

  // Delete all requests in these folders
  const requestsDir = getRequestsDir(collectionId);
  if (fs.existsSync(requestsDir)) {
    const rFiles = fs.readdirSync(requestsDir);
    for (const file of rFiles) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const reqPath = path.join(requestsDir, file);
      const r = safeReadJson(reqPath);
      if (r && r.folderId && foldersToDelete.has(r.folderId)) {
        try {
          fs.unlinkSync(reqPath);
        } catch (_) {}
      }
    }
  }

  // Delete folder json files
  for (const fId of foldersToDelete) {
    const fPath = path.join(foldersDir, `${fId}.json`);
    if (fs.existsSync(fPath)) {
      try {
        fs.unlinkSync(fPath);
      } catch (_) {}
    }
  }

  return { success: true, folderId: safeFolderId };
}

function duplicateFolder(collectionId, folderId) {
  const folderJsonPath = getFolderJsonPath(collectionId, folderId);
  const orig = safeReadJson(folderJsonPath);
  if (!orig) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  // Create new top folder
  const newFolder = createFolder(collectionId, orig.parentFolderId, `${orig.name} (Copy)`);

  // Copy requests in this folder
  const requestsDir = getRequestsDir(collectionId);
  if (fs.existsSync(requestsDir)) {
    const rFiles = fs.readdirSync(requestsDir);
    for (const file of rFiles) {
      if (!file.endsWith('.json') || file.includes('.tmp')) continue;
      const r = safeReadJson(path.join(requestsDir, file));
      if (r && r.folderId === folderId) {
        saveRequest(collectionId, newFolder.id, {
          name: r.name,
          method: r.method,
          url: r.url,
          params: r.params,
          headers: r.headers,
          body: r.body,
          tests: r.tests ? JSON.parse(JSON.stringify(r.tests)) : []
        });
      }
    }
  }

  return newFolder;
}

// ----------------------------------------------------------------------------
// Request Operations
// ----------------------------------------------------------------------------

function saveRequest(collectionId, folderId, requestData, requestId) {
  getCollectionDir(collectionId);

  if (!requestData || typeof requestData !== 'object') {
    throw new Error('Request data must be an object');
  }

  const reqId = requestId ? sanitizeId(requestId, 'Request ID') : `req_${Date.now()}_${randomUUID().slice(0, 6)}`;
  const safeReqName = sanitizeName(requestData.name || 'Untitled Request', 'Request Name');
  const safeFolderId = folderId ? sanitizeId(folderId, 'Folder ID') : null;

  const reqPath = getRequestJsonPath(collectionId, reqId);
  const existing = safeReadJson(reqPath);

  const payload = {
    id: reqId,
    collectionId: sanitizeId(collectionId, 'Collection ID'),
    folderId: safeFolderId,
    name: safeReqName,
    method: typeof requestData.method === 'string' ? requestData.method.toUpperCase().trim() : 'GET',
    url: typeof requestData.url === 'string' ? requestData.url.trim() : '',
    params: Array.isArray(requestData.params) ? requestData.params : [],
    headers: Array.isArray(requestData.headers) ? requestData.headers : [],
    body: requestData.body || '',
    tests: Array.isArray(requestData.tests) ? requestData.tests : (existing?.tests || []),
    roleTesting: requestData.roleTesting && typeof requestData.roleTesting === 'object' ? roleMatrixRunner.sanitizeRoleConfigForPersistence(requestData.roleTesting) : (existing?.roleTesting || null),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  atomicWriteJson(reqPath, payload);
  return payload;
}

function getRequest(collectionId, requestId) {
  const reqPath = getRequestJsonPath(collectionId, requestId);
  const data = safeReadJson(reqPath);
  if (!data) {
    throw new Error(`Request not found: ${requestId}`);
  }
  return data;
}

function renameRequest(collectionId, requestId, newName) {
  const safeName = sanitizeName(newName, 'Request Name');
  const reqPath = getRequestJsonPath(collectionId, requestId);
  const data = safeReadJson(reqPath);
  if (!data) {
    throw new Error(`Request not found: ${requestId}`);
  }

  data.name = safeName;
  data.updatedAt = Date.now();
  atomicWriteJson(reqPath, data);

  return data;
}

function deleteRequest(collectionId, requestId) {
  const reqPath = getRequestJsonPath(collectionId, requestId);
  if (fs.existsSync(reqPath)) {
    fs.unlinkSync(reqPath);
  }
  return { success: true, requestId };
}

function duplicateRequest(collectionId, requestId) {
  const orig = getRequest(collectionId, requestId);
  return saveRequest(collectionId, orig.folderId, {
    name: `${orig.name} (Copy)`,
    method: orig.method,
    url: orig.url,
    params: orig.params,
    headers: orig.headers,
    body: orig.body,
    tests: orig.tests ? JSON.parse(JSON.stringify(orig.tests)) : []
  });
}

module.exports = {
  initStorage,
  getStorageDir,
  sanitizeId,
  sanitizeName,
  assertSafePath,
  atomicWriteJson,
  safeReadJson,
  getCollectionsTree,
  createCollection,
  renameCollection,
  deleteCollection,
  duplicateCollection,
  createFolder,
  renameFolder,
  deleteFolder,
  duplicateFolder,
  saveRequest,
  getRequest,
  renameRequest,
  deleteRequest,
  duplicateRequest
};
