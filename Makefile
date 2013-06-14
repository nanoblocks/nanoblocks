all: nanoblocks.js
	cd blocks/s ; ./build

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

.PHONY: all
