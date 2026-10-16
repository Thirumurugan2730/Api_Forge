/**
 * ApiForge Lite — Step 3 Collections & Folders Storage Automated Test Suite
 * Executed via Node.js built-in test runner (node --test)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storage = require('../src/main/storage/collectionsStorage');

describe('Collections, Folders, and Request Storage (Step 3)', () => {
  let tempDir;

  before(() => {
    // Create an isolated temporary test directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiforge-step3-test-'));
    storage.initStorage(tempDir);
  });

  after(() => {
    // Clean up temporary test directory
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  // 1. Collection Lifecycle
  it('should create, rename, and retrieve collections', () => {
    const col = storage.createCollection('Spring Boot E-Commerce');
    assert.ok(col.id.startsWith('col_'));
    assert.equal(col.name, 'Spring Boot E-Commerce');
    assert.ok(col.createdAt > 0);

    const renamed = storage.renameCollection(col.id, 'Spring Boot Payment Service');
    assert.equal(renamed.name, 'Spring Boot Payment Service');

    const tree = storage.getCollectionsTree();
    const found = tree.find((c) => c.id === col.id);
    assert.ok(found, 'Created collection must be present in tree');
    assert.equal(found.name, 'Spring Boot Payment Service');
  });

  it('should reject invalid or empty collection names', () => {
    assert.throws(() => storage.createCollection(''), /cannot be empty/);
    assert.throws(() => storage.createCollection('   '), /cannot be empty/);
    assert.throws(() => storage.createCollection('a'.repeat(200)), /cannot exceed 128 characters/);
  });

  // 2. Folder Nesting & Organization
  it('should create root folders and nested child folders in a collection', () => {
    const col = storage.createCollection('Order API');

    // Create root folder
    const rootFolder = storage.createFolder(col.id, null, 'v1 Orders');
    assert.ok(rootFolder.id.startsWith('fld_'));
    assert.equal(rootFolder.name, 'v1 Orders');
    assert.equal(rootFolder.parentFolderId, null);

    // Create nested subfolder
    const childFolder = storage.createFolder(col.id, rootFolder.id, 'Admin Endpoints');
    assert.equal(childFolder.parentFolderId, rootFolder.id);

    const tree = storage.getCollectionsTree();
    const colTree = tree.find((c) => c.id === col.id);
    assert.ok(colTree);

    // Root folder should contain child folder
    const foundRoot = colTree.folders.find((f) => f.id === rootFolder.id);
    assert.ok(foundRoot, 'Root folder must exist in collection root');
    const foundChild = foundRoot.folders.find((f) => f.id === childFolder.id);
    assert.ok(foundChild, 'Child folder must be nested under parent folder');
    assert.equal(foundChild.name, 'Admin Endpoints');
  });

  it('should rename and duplicate folders', () => {
    const col = storage.createCollection('Inventory Service');
    const folder = storage.createFolder(col.id, null, 'Warehouses');

    const renamed = storage.renameFolder(col.id, folder.id, 'Global Warehouses');
    assert.equal(renamed.name, 'Global Warehouses');

    const duplicated = storage.duplicateFolder(col.id, folder.id);
    assert.ok(duplicated.id !== folder.id);
    assert.equal(duplicated.name, 'Global Warehouses (Copy)');
  });

  // 3. Request Persistence & Restoration
  it('should save, retrieve, and update a full request with all HTTP metadata', () => {
    const col = storage.createCollection('Customer Service');
    const folder = storage.createFolder(col.id, null, 'Profiles');

    const requestData = {
      name: 'Get Customer Profile',
      method: 'GET',
      url: 'https://api.example.com/customers/42?active=true',
      params: [{ key: 'active', value: 'true', enabled: true }],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      body: ''
    };

    // Save request into folder
    const saved = storage.saveRequest(col.id, folder.id, requestData);
    assert.ok(saved.id.startsWith('req_'));
    assert.equal(saved.name, 'Get Customer Profile');
    assert.equal(saved.folderId, folder.id);
    assert.equal(saved.method, 'GET');
    assert.deepEqual(saved.params, requestData.params);
    assert.deepEqual(saved.headers, requestData.headers);

    // Reopen request
    const reopened = storage.getRequest(col.id, saved.id);
    assert.deepEqual(reopened, saved);

    // Update existing request
    const updated = storage.saveRequest(col.id, folder.id, {
      ...requestData,
      name: 'Get VIP Customer Profile',
      url: 'https://api.example.com/customers/vip/42'
    }, saved.id);

    assert.equal(updated.id, saved.id);
    assert.equal(updated.name, 'Get VIP Customer Profile');
    assert.equal(updated.url, 'https://api.example.com/customers/vip/42');
  });

  it('should duplicate and rename requests independently', () => {
    const col = storage.createCollection('Auth Service');
    const saved = storage.saveRequest(col.id, null, {
      name: 'Login Request',
      method: 'POST',
      url: 'https://auth.example.com/login',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      body: '{"username":"admin"}'
    });

    // Rename
    const renamed = storage.renameRequest(col.id, saved.id, 'User Login');
    assert.equal(renamed.name, 'User Login');

    // Duplicate
    const dup = storage.duplicateRequest(col.id, saved.id);
    assert.ok(dup.id !== saved.id);
    assert.equal(dup.name, 'User Login (Copy)');
    assert.equal(dup.method, 'POST');
    assert.equal(dup.body, '{"username":"admin"}');
  });

  // 4. Deletion Cascade
  it('should cascade delete folder and its contained requests', () => {
    const col = storage.createCollection('Cascade Test');
    const folder = storage.createFolder(col.id, null, 'Temporary Folder');
    const req = storage.saveRequest(col.id, folder.id, {
      name: 'To Be Deleted',
      method: 'DELETE',
      url: 'https://example.com/items/1'
    });

    assert.ok(storage.getRequest(col.id, req.id));

    // Delete folder
    storage.deleteFolder(col.id, folder.id);

    // Request inside deleted folder must no longer exist
    assert.throws(() => storage.getRequest(col.id, req.id), /Request not found/);
  });

  it('should delete a collection and all its contents', () => {
    const col = storage.createCollection('Entire Collection Delete');
    storage.createFolder(col.id, null, 'Folder 1');
    storage.saveRequest(col.id, null, { name: 'Root Req', method: 'GET', url: 'https://example.com' });

    const delRes = storage.deleteCollection(col.id);
    assert.equal(delRes.success, true);

    const tree = storage.getCollectionsTree();
    assert.equal(tree.find((c) => c.id === col.id), undefined);
  });

  // 5. Persistence across Restart Simulation
  it('should persist all collections, folders, and requests across storage re-initialization', () => {
    const col = storage.createCollection('Persistence Verification');
    const fld = storage.createFolder(col.id, null, 'Persistent Folder');
    const req = storage.saveRequest(col.id, fld.id, {
      name: 'Persistent GET',
      method: 'GET',
      url: 'https://spring.io/api/health'
    });

    // Simulate application restart by re-initializing storage on the same directory
    storage.initStorage(tempDir);
    const tree = storage.getCollectionsTree();
    const persistedCol = tree.find((c) => c.id === col.id);

    assert.ok(persistedCol, 'Collection must persist');
    assert.equal(persistedCol.folders.length, 1);
    assert.equal(persistedCol.folders[0].requests.length, 1);
    assert.equal(persistedCol.folders[0].requests[0].id, req.id);
  });

  // 6. Security: Path Traversal Prevention
  it('should reject path-traversal attempts in IDs', () => {
    assert.throws(() => storage.createFolder('../evil', null, 'Folder'), /Invalid Collection ID/);
    assert.throws(() => storage.getRequest('col_valid', '../../etc/passwd'), /Invalid Request ID/);
    assert.throws(() => storage.deleteCollection('..\\..\\windows'), /Invalid Collection ID/);
  });

  // 7. Resilience: Corrupted JSON File Recovery
  it('should gracefully handle and recover from corrupted JSON files without crashing', () => {
    const col = storage.createCollection('Corruption Resilience');
    const validReq = storage.saveRequest(col.id, null, { name: 'Valid Req', method: 'GET', url: 'https://example.com' });

    // Deliberately write corrupted non-JSON into a dummy request file
    const corruptFilePath = path.join(storage.getStorageDir(), col.id, 'requests', 'req_corrupted.json');
    fs.writeFileSync(corruptFilePath, '<<< INVALID UNPARSEABLE JSON CONTENT >>>', 'utf8');

    // Should load cleanly and return the valid request
    const tree = storage.getCollectionsTree();
    const targetCol = tree.find((c) => c.id === col.id);
    assert.ok(targetCol);
    assert.equal(targetCol.requests.length, 1);
    assert.equal(targetCol.requests[0].id, validReq.id);
  });
});
