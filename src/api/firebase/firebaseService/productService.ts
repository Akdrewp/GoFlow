import { Product } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { productDatabase } from "../firestoreDatabase";

/**
 * Handles the business logic for adding a new product to an organization.
 * It verifies the user's permissions and ensures the product ID does not already exist.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the product to.
 * @param productData The data for the new product.
 * @returns A promise that resolves when the product is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or the product ID already exists.
 */
export async function addProductToOrg(token: string, organizationId: string, productData: Product): Promise<void> {
  try {
    // Verify user has permission to WRITE to the products collection.
    const resourcePath = `organizations/${organizationId}/products`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if a product with passed id already exists
    if (await productDatabase.exists(organizationId, productData.productId)) {
      throw new FirebaseVerifyError(
        `Product with ID "${productData.productId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add the product to the database
    await productDatabase.add(organizationId, productData.productId, productData);

  } catch (e) {
    console.error("Error in addProductToOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Fetches a specific product by its ID from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the product resides.
 * @param productId The ID of the product to fetch.
 * @returns A promise that resolves to the Product object if found.
 * @throws {FirebaseVerifyError} If the user is not authorized or the product does not exist.
 */
export async function getProductFromOrg(token: string, organizationId: string, productId: string): Promise<Product> {
  try {
    
    // Verify the user has permission to READ the specific product document.
    const resourcePath = `organizations/${organizationId}/products/${productId}`;
    await canUserAccessData(token, resourcePath, AccessType.READ);

    // Get product from database
    return await productDatabase.get(organizationId, productId);

  } catch (e) {
    console.error(`Error fetching product "${productId}":`, e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating an existing product.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the product resides.
 * @param productId The ID of the product to update.
 * @param productData The complete new data for the product.
 * @returns A promise that resolves when the product is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized, the product does not exist, or IDs mismatch.
 */
export async function updateProductInOrg(token: string, organizationId: string, productId: string, productData: Partial<Product>): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific product document.
    const resourcePath = `organizations/${organizationId}/products/${productId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Make sure passed productId matches productDataId
    if (productId !== productData.productId) {
      throw new FirebaseVerifyError(
        "Product ID in URL does not match product ID in request body.", 
        400 // Bad Request
      );
    }

    // Check if product does not exist
    if (!(await productDatabase.exists(organizationId, productId))) {
      throw new FirebaseVerifyError(
        `Product with ID "${productId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    // Update product in the database
    await productDatabase.update(organizationId, productId, productData);

  } catch (e) {
    console.error("Error in updateProductInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a product from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the product resides.
 * @param productId The ID of the product to delete.
 * @returns A promise that resolves when the product is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized or the product does not exist.
 */
export async function deleteProductFromOrg(token: string, organizationId: string, productId: string): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific product document.
    const resourcePath = `organizations/${organizationId}/products/${productId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Check if product doesn't exist
    if (!(await productDatabase.exists(organizationId, productId))) {
      throw new FirebaseVerifyError(
        `Product with ID "${productId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    /**
     * @todo Add a check to prevent deletion if the product is currently in use by a Loadout
     */
    // if (await loadoutDatabase.isProductInUse(organizationId, productId)) {
    //   throw new FirebaseVerifyError(
    //     `Cannot delete product "${productId}" because it is part of one or more loadouts.`,
    //     409 // Conflict
    //   );
    // }

    // Delete the product from the database.
    await productDatabase.remove(organizationId, productId);

  } catch (e) {
    console.error("Error in deleteProductFromOrg service:", e);
    throw e;
  }
}
