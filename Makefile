all:
	$(MAKE) -C blocks/s
	cat src/nb.common.js src/nb.node.js src/nb.blocks.js src/nb.geometry.js > nanoblocks.js

test-tools:
	test -x "$(shell which stylus)"
	test -x "$(shell which uglifyjs)"
	test -x "$(shell which csso)"

css :
	cd blocks/suggest ; stylus *.styl

.PHONY: all test-tools css

# TODO: посмотреть на grunt
#       https://github.com/cowboy/grunt
