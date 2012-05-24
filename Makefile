all: nanoblocks.js
	$(MAKE) -C blocks/s

test-tools:
	test -x "$(shell which stylus)"
	test -x "$(shell which uglifyjs)"
	test -x "$(shell which csso)"

.PHONY: all test-tools

define SOURCES
	src/nb.banner.js
	src/nb.common.js
	src/nb.node.js
	src/nb.blocks.js
	src/nb.geometry.js
endef
SOURCES:=$(strip $(SOURCES))

nanoblocks.js: $(SOURCES)
	cat $^ > $@

# TODO: посмотреть на grunt
#       https://github.com/cowboy/grunt
