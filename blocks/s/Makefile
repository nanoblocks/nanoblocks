all: all.css

all.css:
	../../node_modules/.bin/stylus < all.styl > all.raw.css
	../../node_modules/.bin/csso all.raw.css all.css
	-rm all.raw.css

.PHONY: all
