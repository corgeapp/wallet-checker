# Requirements Document

## Introduction

This feature extends the collection scanner endpoint response to include additional holder metrics that provide deeper insights into wallet behavior and collection activity. The new fields capture holder scoring, buying patterns, spending behavior, and collection diversity. The system must maintain backward compatibility with existing collection results stored in localStorage.

## Glossary

- **Collection_Scanner**: The frontend system that polls the backend API to retrieve wallet analysis results for a collection of addresses
- **CollectionWalletResult**: The TypeScript interface that defines the structure of each wallet result returned by the collection endpoint
- **Holder_Metrics**: The set of seven new fields that describe wallet holder behavior: holder_score, holder_label, total_buys, total_usd_spent, unique_collections, avg_buy_price_usd, and mint_ratio
- **Backend_API**: The server-side API that processes wallet addresses and returns analysis results
- **LocalStorage**: Browser storage mechanism used to persist collection scan results between sessions
- **Backward_Compatibility**: The ability to handle existing stored results that lack the new holder metrics fields without errors or data loss

## Requirements

### Requirement 1: Add Holder Metrics Fields to Interface

**User Story:** As a developer, I want the CollectionWalletResult interface to include holder metrics fields, so that the frontend can display comprehensive wallet analysis data.

#### Acceptance Criteria

1. THE CollectionWalletResult interface SHALL include a holder_score field of type number
2. THE CollectionWalletResult interface SHALL include a holder_label field of type string
3. THE CollectionWalletResult interface SHALL include a total_buys field of type number
4. THE CollectionWalletResult interface SHALL include a total_usd_spent field of type number
5. THE CollectionWalletResult interface SHALL include a unique_collections field of type number
6. THE CollectionWalletResult interface SHALL include an avg_buy_price_usd field of type number
7. THE CollectionWalletResult interface SHALL include a mint_ratio field of type number
8. THE CollectionWalletResult interface SHALL mark all holder metrics fields as optional using the TypeScript optional property syntax

### Requirement 2: Maintain Backward Compatibility with Stored Results

**User Story:** As a user, I want to rerun previous collection scans without losing existing data, so that I can append new holder metrics to historical results.

#### Acceptance Criteria

1. WHEN the Collection_Scanner loads results from LocalStorage that lack holder metrics fields, THE Collection_Scanner SHALL successfully parse and display those results without errors
2. WHEN the Collection_Scanner merges existing results with new results from the Backend_API, THE Collection_Scanner SHALL preserve all existing fields from both result sets
3. WHEN a wallet address appears in both existing results and new results, THE Collection_Scanner SHALL use the new result data to update the stored entry
4. THE Collection_Scanner SHALL NOT remove or invalidate stored results that lack holder metrics fields

### Requirement 3: Handle Optional Holder Metrics in UI Components

**User Story:** As a user, I want the UI to gracefully handle missing holder metrics, so that I can view both old and new collection results without display errors.

#### Acceptance Criteria

1. WHEN a CollectionWalletResult lacks holder metrics fields, THE UI_Components SHALL display appropriate fallback values or indicators
2. THE UI_Components SHALL NOT throw runtime errors when accessing undefined holder metrics fields
3. WHEN holder metrics fields are present, THE UI_Components SHALL display the numeric values with appropriate formatting
4. WHEN holder_label is present, THE UI_Components SHALL display the label text

### Requirement 4: Preserve Type Safety for Holder Metrics

**User Story:** As a developer, I want TypeScript to enforce correct types for holder metrics, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. THE TypeScript compiler SHALL enforce that holder_score is a number when present
2. THE TypeScript compiler SHALL enforce that holder_label is a string when present
3. THE TypeScript compiler SHALL enforce that total_buys is a number when present
4. THE TypeScript compiler SHALL enforce that total_usd_spent is a number when present
5. THE TypeScript compiler SHALL enforce that unique_collections is a number when present
6. THE TypeScript compiler SHALL enforce that avg_buy_price_usd is a number when present
7. THE TypeScript compiler SHALL enforce that mint_ratio is a number when present
8. THE TypeScript compiler SHALL allow CollectionWalletResult objects to be created without holder metrics fields

### Requirement 5: Support Holder Metrics in Result Merging Logic

**User Story:** As a developer, I want the result merging function to correctly handle holder metrics, so that rerunning scans properly updates wallet data.

#### Acceptance Criteria

1. WHEN the mergeResults function combines two CollectionWalletResult arrays, THE mergeResults function SHALL preserve holder metrics fields from both arrays
2. WHEN a wallet address exists in both arrays with different holder metrics values, THE mergeResults function SHALL use the values from the incoming array
3. WHEN a wallet address exists in the existing array with holder metrics but the incoming array entry lacks them, THE mergeResults function SHALL preserve the existing holder metrics values
4. WHEN a wallet address exists in the existing array without holder metrics but the incoming array entry has them, THE mergeResults function SHALL add the new holder metrics values

### Requirement 6: Validate Holder Metrics Data Types from API

**User Story:** As a developer, I want to ensure the Backend_API returns correctly typed holder metrics, so that the frontend receives valid data.

#### Acceptance Criteria

1. WHEN the Backend_API returns holder_score, THE Backend_API SHALL return a numeric value
2. WHEN the Backend_API returns holder_label, THE Backend_API SHALL return a string value
3. WHEN the Backend_API returns total_buys, THE Backend_API SHALL return a non-negative integer
4. WHEN the Backend_API returns total_usd_spent, THE Backend_API SHALL return a non-negative numeric value
5. WHEN the Backend_API returns unique_collections, THE Backend_API SHALL return a non-negative integer
6. WHEN the Backend_API returns avg_buy_price_usd, THE Backend_API SHALL return a non-negative numeric value
7. WHEN the Backend_API returns mint_ratio, THE Backend_API SHALL return a numeric value between 0 and 1 inclusive
