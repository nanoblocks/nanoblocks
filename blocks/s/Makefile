STYLUS = ../../node_modules/.bin/stylus
CSSO = ../../node_modules/.bin/csso

all: all.css

all.css:
	STYLUS < all.styl > all.raw.css
	CSSO all.raw.css all.css
	-rm all.raw.css

.PHONY: all all.css
