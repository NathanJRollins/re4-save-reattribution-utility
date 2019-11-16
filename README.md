![Vanilla JS](http://vanilla-js.com/assets/button.png)  
# re4-save-reattribution-utility

Converts save game files for Resident Evil 4 (Steam's HD version), allowing users to load save files originally created under different account credentials

## Use it [here](https://nathanjrollins.github.io/re4-save-reattribution-utility/)!


This utility works by overwriting 4 bytes from 2 locations (8 bytes total) in the desired save file with bytes taken from one of a user's own save files.  Not all nonzero bytes from a fresh save are needed (it seems we were probably overwriting things that mattered when we copied them all over - oops).

The 4 bytes @ 1E40 are your steam idv3, but I'm not sure what the 4 bytes beginning at 8 bytes before the end of the file are.  I've tried checking permutations and hashes of steam's id64, idv3, and idv1, even breaking them all down to binary to search for patterns, but I couldn't figure out how to make sense of those last values.  They're definitely needed though - if we only copy the first 4 bytes with the user's Steam ID, or if you only copy the last 4 unknown bytes, the resulting file will fail to load.  We need all 8 bytes, from both locations. 	You definitely need all 4 at the end, as well - trying with only 3 or 2 on either side will fail.
