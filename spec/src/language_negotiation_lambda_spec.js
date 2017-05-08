'use strict';

var languageNegotiationLambda = require( '../../src/language_negotiation_lambda' );

describe( 'languageNegotiationLambda', function() {
    var event = {
        "Records": [
            {
              "cf": {
                "request": {
                  "headers": {
                    "Host": [
                      "localhost"
                    ],
                    "User-Agent": [
                      "Test Agent"
                    ]
                  },
                  "clientIp": "2001:cdba::3257:9652",
                  "httpVersion": "2.0",
                  "uri": "/",
                  "method": "GET"
                },
                "config": {
                  "distributionId": "EXAMPLE"
                }
              }
            }
        ]
    };
    var default_header = ['en'];

    beforeEach(function(){
        delete event.Records[0].cf.request.headers["Cookie"];
        delete event.Records[0].cf.request.headers["Accept-Language"];
        delete event.Records[0].cf.request.headers["X-Accept-Language"];
    });

    describe( 'Well formed cookies', function(){
        [
            { cookie: "en",     expected: "en" },
            { cookie: "EN",     expected: "en" },
            { cookie: "es",     expected: "es" },
            { cookie: "ES",     expected: "es" },
            { cookie: "en-US",  expected: "en" },
            { cookie: "es-419", expected: "es" }
        ].forEach( function( cookies ) {
            it( `Resolves cookie ${cookies.cookie} to ${cookies.expected}`, function( done ) {
                event.Records[0].cf.request.headers.Cookie = [
                    process.env.LANGUAGE_COOKIE_NAME+"="+cookies.cookie
                ];

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual([cookies.expected]);
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });

        [
            "fr",
            ""
        ].forEach( function( cookie ) {
            it( `Resolves unsupported cookie: ${cookie} to browser language`, function( done ) {
                event.Records[0].cf.request.headers.Cookie = [
                    process.env.LANGUAGE_COOKIE_NAME+"="+cookie
                ];
                event.Records[0].cf.request.headers['Accept-Language'] = ['es'];

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual(['es']);
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });
    });

    describe( 'Well formed headers', function(){
        [
            { header: "en",                   customHeader: "en" },
            { header: "es",                   customHeader: "es" },
            { header: "de",                   customHeader: "en" },
            { header: "en;q=0.8,es",          customHeader: "es" },
            { header: "es;q=0.8,en",          customHeader: "en" },
            { header: "de,en;q=0.8",          customHeader: "en" },
            { header: "de,es;q=0.8",          customHeader: "es" },
            { header: "es;q=NaN",             customHeader: "es" },
            { header: "es;q=NaN,en;q=0.01",   customHeader: "en" },
            { header: "de,en;q=0.2,es;q=0.8", customHeader: "es" },
            { header: "EN",                   customHeader: "en" },
            { header: "ES",                   customHeader: "es" },
            { header: "EN-US",                customHeader: "en" },
            { header: "ES-419",               customHeader: "es" }
        ].forEach( function( headers ) {
            it( `Resolves header ${headers.header} to ${headers.customHeader}`, function( done ) {
                event.Records[0].cf.request.headers['Accept-Language'] = [headers.header];

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual([headers.customHeader]);
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });
    });

    describe( 'Malformed cookies', function(){
        [
            undefined,
            NaN,
            null
        ].forEach( function( cookie ) {
            it( `Passes on cookie ${cookie} and uses browser language`, function( done ) {
                event.Records[0].cf.request.headers.Cookie = [cookie];
                event.Records[0].cf.request.headers['Accept-Language'] = ['es'];
                spyOn(console, "log");

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual(['es']);
                        expect( console.log ).toHaveBeenCalled();
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });
    });

    describe( 'Malformed headers', function(){
        [
            undefined,
            NaN,
            null
        ].forEach( function( header ) {
            it( `Resolves header ${header} to default and logs error`, function( done ) {
                event.Records[0].cf.request.headers['Accept-Language'] = [header];
                spyOn(console, "log");

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual(default_header);
                        expect( console.log ).toHaveBeenCalled();
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });

        [
            "",
            "dhbeiyu292dfiue2"
        ].forEach( function( header ) {
            it( `Resolves header ${header} to default`, function( done ) {
                event.Records[0].cf.request.headers['Accept-Language'] = [header];

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual(default_header);
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });
    });

    describe( 'Errors', function(){
        it( `Truthy non-string Cookie value should error to log, but still set default`, function( done ) {
            event.Records[0].cf.request.headers.Cookie = [{}];
            spyOn(console, "log");

            languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                try {
                    expect( err ).toBeNull();
                    expect( result ).toBeTruthy();
                    expect( result.headers['X-Accept-Language'] ).toEqual(default_header);
                    expect( console.log ).toHaveBeenCalledWith(
                        "Error fetching cookie data: TypeError: cookies_str.replace is not a function"
                    );
                    done();
                }
                catch( error ) {
                    done( error );
                }
            });
        });

        it( `Truthy non-string Accept-Language value should error to log, but still set default`, function( done ) {
            event.Records[0].cf.request.headers['Accept-Language'] = [{}];
            spyOn(console, "log");

            languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                try {
                    expect( err ).toBeNull();
                    expect( result ).toBeTruthy();
                    expect( result.headers['X-Accept-Language'] ).toEqual(default_header);
                    expect( console.log ).toHaveBeenCalledWith(
                        "Error fetching Accept-Language data: TypeError: language_str.split is not a function"
                    );
                    done();
                }
                catch( error ) {
                    done( error );
                }
            });
        });

        it( `Malformed headers object should error to log, but still set default`, function( done ) {
            event.Records[0].cf.request.headers = undefined;
            spyOn(console, "log");

            languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                try {
                    expect( err ).toBeNull();
                    expect( result ).toBeTruthy();
                    expect( result.headers['X-Accept-Language'] ).toBeUndefined();
                    expect( console.log ).toHaveBeenCalledWith(
                        "Error assigning default language:  TypeError: Cannot assign to read only property 'X-Accept-Language' of undefined"
                    );
                    done();
                }
                catch( error ) {
                    done( error );
                }
            });
        });
    });


});
