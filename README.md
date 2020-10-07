# gamemusic.js
Copyright 2010-2020 Adam Nielsen <<malvineous@shikadi.net>>  

This is a Javascript library that can read and write music files used by a
number of MS-DOS games from the 1990s.  This library is an attempt to provide
a unified interface for reading and writing many of these formats.

## Installation as an end-user

If you wish to use the command-line `gamemus` utility to work with music files
directly, you can install the library globally on your system:

    npm install -g @malvineous/gamemusic

### Command line interface

The `gamemus` utility can be used to read and write music files in any
supported format.  Commands are specified one after the other as parameters.
Use the `--help` option to get a list of all the available commands.  Some
quick examples:

    # Convert a DOSBox raw OPL capture to MIDI format
    gamemus open example.dro save -f mus-mid-type1 output.mid

To get a list of supported file formats, run:

    gamemus --formats

## Installation as a dependency

If you wish to make use of the library in your own project, install it
in the usual way:

    npm install @malvineous/gamemusic

See `cli/index.js` for example use.

## Installation as a contributor

If you would like to help add more file formats to the library, great!  Clone
the repo, and to get started:

    npm install --dev

Run the tests to make sure everything worked:

    npm -s run test

You're ready to go!  To add a new file format:

 1. Create a new file in the `formats/` folder for your format.
    Copying an existing file that covers a similar format will help
    considerably.
    
 2. Edit `src/index.js` and add a `require()` statement for your new file.
    
 3. Make a folder in `test/` for your new format and populate it with
    files similar to the other formats.  The tests work by creating
    a standard song with a handful of musical events in it, and comparing the
    result to what is inside this folder.
    
    You can either create these file by hand, with another utility, or if
    you are confident that your code is correct, from the code itself.  This is
    done by setting an environment variable when running the tests, which will
    cause the archive file produced by your code to be saved to a temporary
    file in the current directory:
    
        SAVE_FAILED_TEST=1 npm -s run test
        mv error1.bin test/mus-myformat/default.bin

If your music format has any sort of compression or encryption, these
algorithms should go into the `gamecomp` project instead.  This is to make it
easier to reuse the algorithms, as many of them (particularly the compression
ones) are used amongst many unrelated file formats.  All the `gamecomp`
algorithms are available to be used by any music format in this library.

During development you can test your code like this:

    # Read a sample song and list its details, with debug messages on
    $ DEBUG='gamemusicjs:*' ./bin/gamemus open -f mus-myformat example.dat list

    # Make sure the format is identified correctly or if not why not
    $ DEBUG='gamemusicjs:*' ./bin/gamemus identify example.dat

If you use `debug()` rather than `console.log()` in your code then these
messages can be left in for future diagnosis as they will only appear when the
`DEBUG` environment variable is set correctly.

## Documentation

You can generate the documentation locally by running `npm serve-doc` or if you
want it to regenerate automatically when the code is modified,
`npm run watch serve-doc`.

### Development tips

This is a list of some common issues and how they have been solved by some of
the format handlers:

##### Multiple related formats

* `mus-imf-idsoftware` has a number of different variants.  The common code is
  implemented in a base class, with multiple classes inheriting from that.
  Each child class is then considered an independent file format, although they
  ultimately share common code.
