# ADR-006: Secret Management - Encryption Strategy

## Status
Accepted

## Context
We need to securely store API keys and other sensitive data in PostgreSQL while maintaining usability. The requirements include encryption at rest, key rotation, and audit trail.

## Decision
We choose **application-level encryption using AES-256-GCM** with database-level pgcrypto as backup.

## Rationale

### Requirements
- **Encryption at Rest**: Sensitive data must be encrypted in database
- **Key Rotation**: Ability to rotate encryption keys
- **Performance**: Reasonable encryption/decryption performance
- **Audit Trail**: Track access to sensitive data
- **Backup Strategy**: Secure backup and recovery

### Application-Level Encryption Advantages
1. **Control**: Full control over encryption algorithm and keys
2. **Portability**: Not tied to specific database features
3. **Flexibility**: Can implement custom key management
4. **Versioning**: Can support multiple encryption versions
5. **Testing**: Easier to test encryption logic

### AES-256-GCM Choice
- **Strong**: AES-256 is industry standard
- **Authenticated**: GCM mode provides integrity verification
- **Performance**: Hardware acceleration on modern CPUs
- **Standard**: Widely supported and audited

### Key Management Strategy
- **Primary**: Environment variable for encryption key
- **Backup**: Key rotation through secure deployment process
- **Future**: External secret manager (AWS KMS, HashiCorp Vault)

## Consequences
- API keys will be encrypted before database storage
- Encryption keys will be managed via environment variables
- Key rotation will require database re-encryption
- All sensitive data access will be logged
- Backups will contain encrypted data only

## Implementation Notes
- Use crypto module's AES-256-GCM implementation
- Store IV and auth tag alongside encrypted data
- Implement key rotation procedure
- Hash sensitive data for indexing/searching
- Never log raw sensitive data
- Use separate keys for different environments

## Encryption Format
```
base64(iv):base64(authTag):base64(encryptedData)
```

## Data Classification
**Highly Sensitive (Encrypt)**:
- API keys (SerpApi, OpenAI, Claude, Gemini)
- Database credentials (if stored)
- External service tokens

**Medium Sensitive (Hash)**:
- User passwords (if implemented)
- API key identifiers for deduplication

**Low Sensitivity (Plain Text)**:
- User preferences
- Non-sensitive configuration
- Public URLs and content

## Key Rotation Procedure
1. Generate new encryption key
2. Update environment variable
3. Re-encrypt all sensitive data with new key
4. Verify decryption works
5. Retire old key after verification period

## Security Considerations
- Keys in environment variables (protected by container orchestration)
- No keys in application code or configuration files
- Regular key rotation (quarterly or when compromise suspected)
- Audit logging for all encryption/decryption operations
- Memory cleanup after key operations