# Unicode Numerals Fix - Implementation Plan

**Date**: 2025-12-04
**Based on**: UNICODE_NUMERALS_IMPLEMENTATION.md from replybot
**Repository**: translate-typeform
**Following**: CLAUDE.md development philosophy

## Problem Statement

The current `_isNumber()` function in `validator.js:173-175` has a critical bug:
```javascript
const normalized = normalizeUnicodeNumerals(num)
  .replace(/,/g, '')  // ← REMOVES ALL COMMAS
  .replace(/\./g, '')  // ← REMOVES ALL DOTS
  .trim()
```

This destroys decimal values:
- `"100.50"` → `"10050"` (100x error!)
- `"19.99"` → `"1999"` (100x error!)
- `"१००.५"` → `"1005"` (10x error!)

## Implementation Strategy

Following the **incremental progress** principle from CLAUDE.md, we'll implement in 3 phases:

### Phase 1: Fix Critical Bug (Immediate) ⚠️ PRIORITY

**Goal**: Stop destroying decimal values while maintaining backward compatibility

**Changes to `validator.js`**:

1. **Separate digit normalization from separator handling**
   - Keep `normalizeUnicodeNumerals()` as-is (lines 72-130)
   - Fix `_isNumber()` to handle separators intelligently

2. **New approach in `_isNumber()`**:
   ```javascript
   // Strategy: Only remove separators if they're clearly thousands separators
   // A separator is a thousands separator if it's NOT the last dot/comma

   function _isNumber(num) {
     // ... existing type checks ...

     const normalized = normalizeUnicodeNumerals(num)

     // Remove spaces (always safe)
     let cleaned = normalized.trim().replace(/\s+/g, '')

     // Handle separators intelligently:
     // - If there's only ONE dot/comma, treat it as decimal separator (keep it as .)
     // - If there are multiple, the last one is decimal, others are thousands (remove them)

     // ... new logic here ...

     // Validate the result
     const parsed = parseFloat(cleaned)
     return !isNaN(parsed) && isFinite(parsed)
   }
   ```

3. **Test coverage**:
   - Decimal preservation: `"100.50"` → valid, equals 100.50
   - Unicode decimals: `"१००.५"` → valid, equals 100.5
   - Thousands separators: `"1,000.50"` → valid, equals 1000.50
   - Mixed: `"1,234,567.89"` → valid, equals 1234567.89
   - Edge cases: multiple dots, invalid patterns

### Phase 2: Add Locale Awareness (Short-term)

**Goal**: Support locale-specific separator conventions

**New functions to add**:

1. `getLocaleInfo(locale)` - Uses `Intl.NumberFormat` to detect separators
2. `parseLocaleNumber(str, locale)` - Parses with locale context
3. `isValidNumberFormat(str, locale)` - Validates format before parsing

**Changes**:
- Add optional `locale` parameter to `_isNumber()`
- Export new functions for use in replybot
- Default to `'en-US'` for backward compatibility

**Test coverage**:
- US format: `"1,234.56"` with locale `'en-US'`
- German format: `"1.234,56"` with locale `'de-DE'`
- Arabic format: `"١٬٢٣٤٫٥٦"` with locale `'ar-SA'`
- Indian format: `"12,34,567.89"` with locale `'hi-IN'`

### Phase 3: Improve Validation (Short-term)

**Goal**: Reject ambiguous and invalid input

**Changes to `_isNumber()`**:

1. **Reject scientific notation**: `"1e5"` → invalid
2. **Reject multiple decimal points**: `"1.2.3"` → invalid
3. **Validate separator positions**: Ensure separators follow locale patterns
4. **Better error messages**: Clear feedback on why validation failed

**Test coverage**:
- Scientific notation rejection
- Multiple decimal points rejection
- Invalid separator patterns
- Edge cases: `"Infinity"`, `"NaN"`, `"-"`, `"+"`

## Implementation Order

Following **sequential implementation strategy** from CLAUDE.md:

1. ✅ **Plan & Document** (this file)
2. 🔄 **Phase 1 Implementation**
   - a. Write new helper function for separator detection
   - b. Update `_isNumber()` with new logic
   - c. Add Phase 1 tests
   - d. Run tests, verify all pass
3. ⏳ **Phase 2 Implementation**
   - a. Add `getLocaleInfo()` function
   - b. Add `parseLocaleNumber()` function
   - c. Add `isValidNumberFormat()` function
   - d. Update `_isNumber()` to accept locale parameter
   - e. Add Phase 2 tests
   - f. Run tests, verify all pass
4. ⏳ **Phase 3 Implementation**
   - a. Add scientific notation rejection
   - b. Add multiple decimal rejection
   - c. Add separator pattern validation
   - d. Add Phase 3 tests
   - e. Run tests, verify all pass
5. ⏳ **Integration & Documentation**
   - a. Update module exports
   - b. Check replybot integration
   - c. Run full test suite
   - d. Update documentation

## Quality Gates (from CLAUDE.md)

- ✅ Zero-warning builds as baseline
- ✅ All functionality verified after changes
- ✅ Clear git commits that tell the story
- ✅ Working software over perfect architecture

## Testing Strategy

Following **"test after each meaningful change"** principle:

### Unit Tests (validator.test.js)

**Phase 1 Tests**:
```javascript
describe('Phase 1: Decimal preservation', () => {
  it('preserves decimal values', () => {
    // "100.50" should be valid and equal 100.50
    // "१००.५" should be valid and equal 100.5
    // "19.99" should be valid and equal 19.99
  })

  it('handles thousands separators', () => {
    // "1,000" should be valid
    // "1,000.50" should be valid and equal 1000.50
    // "१,००,०००" should be valid and equal 100000
  })

  it('handles edge cases', () => {
    // "1.2.3" should be invalid (multiple decimals)
    // "1,234,567.89" should be valid
    // "-0.04" should be valid
  })
})
```

**Phase 2 Tests** (locale-aware):
```javascript
describe('Phase 2: Locale-aware parsing', () => {
  it('parses US format', () => {
    // "1,234.56" with 'en-US' → 1234.56
  })

  it('parses German format', () => {
    // "1.234,56" with 'de-DE' → 1234.56
  })

  it('parses Arabic format', () => {
    // "١٬٢٣٤٫٥٦" with 'ar-SA' → 1234.56
  })
})
```

**Phase 3 Tests** (validation):
```javascript
describe('Phase 3: Strict validation', () => {
  it('rejects scientific notation', () => {
    // "1e5" should be invalid
    // "1E10" should be invalid
  })

  it('rejects multiple decimals', () => {
    // "1.2.3" should be invalid
  })
})
```

### Integration Testing

After each phase, verify:
1. `npm test` passes all tests
2. Existing tests still pass (backward compatibility)
3. New tests pass (new functionality)

## Rollback Plan

Following **"maintain working state"** principle:

If any phase breaks existing functionality:
1. Immediately revert changes
2. Analyze root cause
3. Fix issue in isolation
4. Re-test before committing

## Success Criteria

### Phase 1 Complete When:
- ✅ Decimal values preserved correctly
- ✅ All existing tests pass
- ✅ New decimal preservation tests pass
- ✅ No regressions in unicode numeral support

### Phase 2 Complete When:
- ✅ Locale-aware parsing works for 4+ locales
- ✅ All Phase 1 tests still pass
- ✅ New locale tests pass
- ✅ Backward compatible (default to en-US)

### Phase 3 Complete When:
- ✅ Invalid patterns rejected
- ✅ All previous tests still pass
- ✅ New validation tests pass
- ✅ Clear error messages

### Overall Complete When:
- ✅ All 3 phases implemented
- ✅ Full test suite passes
- ✅ replybot integration verified
- ✅ Documentation updated
- ✅ Clean git history with descriptive commits

## Risk Mitigation

### Risk: Breaking backward compatibility
**Mitigation**:
- Keep all existing function signatures
- Add optional parameters with sensible defaults
- Maintain all existing test cases

### Risk: Locale complexity getting out of hand
**Mitigation**:
- Start with 4 common locales (en-US, de-DE, ar-SA, hi-IN)
- Use built-in Intl API (no external dependencies)
- Keep implementation simple and pragmatic

### Risk: Over-engineering the solution
**Mitigation**:
- Follow "small, focused changes" principle
- Test after each change
- Stop at "good enough" for current use case
- Re-evaluate at Phase 4 if complexity grows

## Next Steps

1. Review this plan with user
2. Get confirmation on approach
3. Begin Phase 1 implementation
4. Test thoroughly after each change
5. Commit with clear messages

## References

- UNICODE_NUMERALS_IMPLEMENTATION.md (original analysis)
- CLAUDE.md (development philosophy)
- validator.js:72-180 (code to fix)
- validator.test.js:69-193 (existing tests)
