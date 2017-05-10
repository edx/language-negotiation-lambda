'use strict';

var languageNegotiationLambda = require( '../../src/language_negotiation_lambda' );

describe( 'languageNegotiationLambda', function() {
    var event,
        default_header = ['en'];

    beforeEach(function(){
        // Cloudfront Request Object
        event = {
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
    });

    describe( 'Valid cookies', function(){
        [
            { cookie: "en",     expected: "en" },
            { cookie: "EN",     expected: "en" },
            { cookie: "es",     expected: "es" },
            { cookie: "ES",     expected: "es" },
            { cookie: "en-US",  expected: "en" },
            { cookie: "es-419", expected: "es" },
            { cookie: "es_419", expected: "es" },
            { cookie: "fr",     expected: "es" },
            { cookie: "",       expected: "es" }
        ].forEach( function( cookies ) {
            it( `Resolves cookie ${cookies.cookie} to ${cookies.expected}`, function( done ) {
                event.Records[0].cf.request.headers.Cookie = [
                    process.env.LANGUAGE_COOKIE_NAME+"="+cookies.cookie
                ];
                event.Records[0].cf.request.headers['Accept-Language'] = ['es'];

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
    });

    describe( 'Valid headers', function(){
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

    describe( 'Invalid cookies', function(){
        [
            undefined,
            NaN,
            null,
            {}
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

    describe( 'Invalid headers', function(){
        [
            { header: undefined, log: true },
            { header: NaN,       log: true },
            { header: null,      log: true },
            { header: "",        log: false },
            { header: "GaRbAgE", log: false },
            { header: {},        log: true }
        ].forEach( function( header ) {
            it( `Resolves header ${header.header} to default`, function( done ) {
                event.Records[0].cf.request.headers['Accept-Language'] = [header.header];
                spyOn(console, "log");

                languageNegotiationLambda.handler( event, { /* context */ }, (err, result) => {
                    try {
                        expect( err ).toBeNull();
                        expect( result.headers['X-Accept-Language'] ).toEqual(default_header);
                        if( log ){
                            expect( console.log ).toHaveBeenCalled();
                        }
                        done();
                    }
                    catch( error ) {
                        done( error );
                    }
                });
            });
        });
    });
});
