/* eslint-disable  @typescript-eslint/no-explicit-any */

// src/api/firebase/__tests__/firestoreDatabaseService.test.ts
import { firebaseDatabase } from '../firestoreDatabase';

jest.mock('../firebaseConfig', () => ({
  db: { firestoreInstance: true },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

import { doc, setDoc, collection, getDoc, getDocs, query, where } from 'firebase/firestore';
import { UserProfile, Organization } from '@/api/database/database';


describe('firebaseDatabase', () => {
  // Helper mocks for Firestore snapshots
  const mockDocSnapshot = (exists: boolean, data?: any) => ({
    exists: () => exists,
    data: () => data,
    id: 'mock-doc-id', // A consistent ID for mock documents
  });

  const mockQuerySnapshot = (docs: any[] = []) => ({
    empty: docs.length === 0,
    docs: docs.map(d => ({
      id: d.uid || 'mock-doc-id-' + Math.random().toString(36).substring(7), // Unique ID for each mock doc in a query
      data: () => d,
      exists: () => true
    })),
    forEach: jest.fn(callback => docs.forEach(d => callback({ data: () => d }))),
    size: docs.length
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    // Default mocks for isValidUserFormData Firestore calls: User does NOT exist by default
    (getDoc as jest.Mock).mockResolvedValue(mockDocSnapshot(false)); // Default: User UID does not exist
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot([])); // Default: No users with that name exist
    (doc as jest.Mock).mockReturnValue({}); // doc returns a DocumentReference, often mocked as empty object
    (collection as jest.Mock).mockReturnValue({}); // collection returns a CollectionReference
    // query and where often don't need complex mocks if getDocs handles the return value,
    // but mocking implementation can help confirm args if needed.
    (query as jest.Mock).mockImplementation((_collectionRef, ...constraints) => ({ _collectionRef, _constraints: constraints }));
    (where as jest.Mock).mockImplementation((field, op, value) => ({ field, op, value }));
  });

  describe('addUserToDatabase', () => {
    it('should add a user document with correct data and UID as doc ID', async () => {
      const mockUser: UserProfile = {
        uid: 'user_uid_123',
        name: 'Test User',
        email: 'user@example.com',
        createdAt: new Date(),
      };

      await firebaseDatabase.addUserToDatabase(mockUser);

      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUser.uid);
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: mockUser.name,
          email: mockUser.email,
          uid: mockUser.uid,
          createdAt: mockUser.createdAt,
        })
      );
      const callArgs = (setDoc as jest.Mock).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('organizationId');
      expect(callArgs).not.toHaveProperty('employeeId');
    });

    it('should add a user document with organization and employee IDs', async () => {
      const mockUserWithOrg: UserProfile = {
        uid: 'user_uid_org',
        name: 'Org User',
        email: 'org@example.com',
        organizationId: 'ORG456',
        employeeId: 'EMP789',
        createdAt: new Date(),
      };

      await firebaseDatabase.addUserToDatabase(mockUserWithOrg);

      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: mockUserWithOrg.name,
          email: mockUserWithOrg.email,
          uid: mockUserWithOrg.uid,
          organizationId: mockUserWithOrg.organizationId,
          employeeId: mockUserWithOrg.employeeId,
          createdAt: mockUserWithOrg.createdAt,
        })
      );
    });

    it('should throw an error if Firestore operation fails when adding user', async () => {
      const mockUser: UserProfile = { uid: 'fail_uid', name: 'Fail User', email: 'fail@example.com', createdAt: new Date() };
      const errorMessage = 'Firestore write failed for user';
      (setDoc as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(firebaseDatabase.addUserToDatabase(mockUser)).rejects.toThrow(
        `Failed to add user to database: ${errorMessage}`
      );
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when uid, name, email, or createdAt is undefined or null', async () => {

      // Test 1: Missing UID
      const userMissingUid: UserProfile = {
      uid: undefined as any, // Intentionally make uid undefined
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userMissingUid)).rejects.toThrow(
      "Failed to add user to database: User profile 'uid' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled(); // setDoc should not be called

      // Test 2: Null UID
      const userNullUid: UserProfile = {
      uid: null as any, // Intentionally make uid null
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userNullUid)).rejects.toThrow(
      "Failed to add user to database: User profile 'uid' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();

      // Test 3: Empty string UID
      const userEmptyUid: UserProfile = {
      uid: '', // Intentionally make uid an empty string
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userEmptyUid)).rejects.toThrow(
      "Failed to add user to database: User profile 'uid' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();


      // Test 4: Missing Name
      jest.clearAllMocks(); // Clear mocks for the next independent test case
      (setDoc as jest.Mock).mockResolvedValue(undefined); // Reset default mock
      (doc as jest.Mock).mockReturnValue({}); // Reset default mock
      const userMissingName: UserProfile = {
      uid: 'some_uid',
      name: undefined as any, // Intentionally make name undefined
      email: 'test@example.com',
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userMissingName)).rejects.toThrow(
      "Failed to add user to database: User profile 'name' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();

      // Test 5: Null Name
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userNullName: UserProfile = {
      uid: 'some_uid',
      name: null as any, // Intentionally make name null
      email: 'test@example.com',
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userNullName)).rejects.toThrow(
      "Failed to add user to database: User profile 'name' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();


      // Test 6: Missing Email
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userMissingEmail: UserProfile = {
      uid: 'some_uid',
      name: 'Test Name',
      email: undefined as any, // Intentionally make email undefined
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userMissingEmail)).rejects.toThrow(
      "Failed to add user to database: User profile 'email' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();

      // Test 7: Null Email
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userNullEmail: UserProfile = {
      uid: 'some_uid',
      name: 'Test Name',
      email: null as any, // Intentionally make email null
      createdAt: new Date(),
      };
      await expect(firebaseDatabase.addUserToDatabase(userNullEmail)).rejects.toThrow(
      "Failed to add user to database: User profile 'email' is required and must be a non-empty string."
      );
      expect(setDoc).not.toHaveBeenCalled();


      // Test 8: Missing createdAt
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userMissingCreatedAt: UserProfile = {
      uid: 'some_uid',
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: undefined as any, // Intentionally make createdAt undefined
      };
      await expect(firebaseDatabase.addUserToDatabase(userMissingCreatedAt)).rejects.toThrow(
      "Failed to add user to database: User profile 'createdAt' is required and must be a valid Date object."
      );
      expect(setDoc).not.toHaveBeenCalled();

      // Test 9: Null createdAt
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userNullCreatedAt: UserProfile = {
      uid: 'some_uid',
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: null as any, // Intentionally make createdAt null
      };
      await expect(firebaseDatabase.addUserToDatabase(userNullCreatedAt)).rejects.toThrow(
      "Failed to add user to database: User profile 'createdAt' is required and must be a valid Date object."
      );
      expect(setDoc).not.toHaveBeenCalled();

      // Test 10: Invalid Date for createdAt
      jest.clearAllMocks();
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({});
      const userInvalidDateCreatedAt: UserProfile = {
      uid: 'some_uid',
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: new Date('invalid date string') as any, // Intentionally make createdAt an invalid Date
    };
    await expect(firebaseDatabase.addUserToDatabase(userInvalidDateCreatedAt)).rejects.toThrow(
    "Failed to add user to database: User profile 'createdAt' is required and must be a valid Date object."
    );
    expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('addOrganizationToDatabase', () => {
    // This test now ensures organizationId is ALWAYS present in the payload
    it('should add an organization document with correct data, using UID as doc ID, and including organizationId', async () => {
      const mockOrg: Organization = {
        uid: 'org_auth_uid_123', // Firebase Auth UID (doc ID)
        name: 'Test Org',
        email: 'org@test.com',
        organizationId: 'TEST_ORG_ID_ABC', // REQUIRED field now
        createdBy: 'creator_user_uid',
        createdAt: new Date(),
      };

      await firebaseDatabase.addOrganizationToDatabase(mockOrg);

      // Verify doc() was called with the organization's Firebase Auth UID
      expect(doc).toHaveBeenCalledTimes(1);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'organizations', mockOrg.uid);

      // Verify setDoc() was called with the correct data, including organizationId
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(), // The doc reference returned by mockDoc
        expect.objectContaining({
          name: mockOrg.name,
          email: mockOrg.email,
          uid: mockOrg.uid,
          organizationId: mockOrg.organizationId, // Assert it's present and correct
          createdBy: mockOrg.createdBy,
          createdAt: mockOrg.createdAt,
        })
      );
    });

    // We no longer need a separate test for "including organizationId if provided"
    // because it's now always required and always included.
    // The previous test covers this.

    it('should throw an error if organization creation fails', async () => {
      // Ensure mockOrg adheres to the new required `organizationId`
      const mockOrg: Organization = {
        uid: 'fail_org_uid',
        name: 'Fail Org',
        email: 'fail@org.com',
        organizationId: 'FAIL_ORG_ID', // Required
        createdBy: 'creator_uid',
        createdAt: new Date()
      };
      const errorMessage = 'Firestore write failed for organization';
      (setDoc as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(firebaseDatabase.addOrganizationToDatabase(mockOrg)).rejects.toThrow(
        `Failed to add organization to database: ${errorMessage}`
      );
      expect(setDoc).toHaveBeenCalledTimes(1);
    });
  });
});