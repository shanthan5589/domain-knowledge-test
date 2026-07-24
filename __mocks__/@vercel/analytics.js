// CJS stub for @vercel/analytics — Jest can't parse the package's ESM dist.
// Tests that need to assert track() calls use jest.mock('@vercel/analytics', factory)
// to override this; tests that just need the import to resolve without error
// automatically get this stub.
const track = jest.fn()
module.exports = { track }
