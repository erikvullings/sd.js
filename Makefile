# if you invoke make as 'make V=1' it will verbosely list what it is
# doing, otherwise it defaults to pretty mode, which makes build
# errors _much_ easier to see
ifneq ($V, 1)
MAKEFLAGS = -s
endif

PYTHON := python2

HAMMER_JS     := bower_components/hammerjs/hammer.js #bower_components/hammerjs/plugins/hammer.showtouches.js bower_components/hammerjs/plugins/hammer.fakemultitouch.js
HAMMER_MIN_JS := bower_components/hammerjs/hammer.min.js #bower_components/hammerjs/plugins/hammer.showtouches.js bower_components/hammerjs/plugins/hammer.fakemultitouch.js

VENDOR_JS     := $(HAMMER_JS) lib/vendor/mustache.js lib/vendor/q.js lib/vendor/snapsvg.js
VENDOR_MIN_JS := $(HAMMER_MIN_JS) lib/vendor/mustache.js lib/vendor/q.js lib/vendor/snapsvg.js

RTEST_DIR     := test/test-models
RTEST_CMD     := $(RTEST_DIR)/regression-test.py
REXE          := mdl.js

all: dist

dist: dist/sd.js dist/sd.min.js

bower_components:
	bower install
	touch $@

node_modules: package.json
	npm install
	touch $@

node_modules/.bin/r.js: node_modules bower_components
	touch $@

lib/runtime_ugly.js: lib/runtime_src.js Makefile
	cp lib/runtime_src.js $@
#	node_modules/.bin/uglifyjs lib/runtime_src.js -c -m -o $@

lib/runtime.js: lib/runtime_ugly.js lib/epilogue_src.js lib/draw.css quote_runtime.py Makefile
	$(PYTHON) quote_runtime.py >$@

dist/sd.js: node_modules/.bin/r.js build.js lib/*.js lib/runtime.js $(VENDOR_JS)
	mkdir -p dist
	node_modules/.bin/r.js -o build.js
	cat $(VENDOR_JS) dist/sd.nodeps.js >$@

dist/sd.min.js: node_modules/.bin/r.js build_min.js lib/*.js lib/runtime.js $(VENDOR_JS)
	mkdir -p dist
	node_modules/.bin/r.js -o build_min.js
	cat $(VENDOR_MIN_JS) dist/sd.nodeps.min.js >$@

hint: lib/runtime.js
	node_modules/.bin/jshint --config .jshintrc lib/*.js

jsdeps:
	mkdir -p lib/vendor
	curl -o lib/vendor/require.js    'http://requirejs.org/docs/release/2.1.9/comments/require.js'

clean:
	rm -rf dist
	rm -f lib/runtime.js

$(RTEST_CMD): $(RTEST_DIR) .gitmodules
	@echo "  GIT   $<"
	git submodule update --init
	touch $@

check: lib/runtime.js node_modules bower_components
	node_modules/.bin/nodeunit test/runner.js
	./$(RTEST_CMD) ./$(REXE) $(RTEST_DIR)


.PHONY: all dist hint jsdeps clean check
