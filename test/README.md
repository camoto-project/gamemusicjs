## Running the tests

You can run the tests through `npm`:

  npm -s run test

If a test fails but the data is correct (such as after fixing bugs or
adding support for a new format), the testdata can be updated by
saving the failed data to a file:

  SAVE_FAILED_TEST=1 npm -s run test

This will save the failed test to `error.bin` which can be used to
overwrite the old testdata file.

To run only some tests, and with debugging info, use:

  DEBUG='gamemusicjs:*' npm -s run test -- -g mus-imf-idsoftware-type0
