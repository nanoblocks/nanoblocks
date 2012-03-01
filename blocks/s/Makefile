all: all.css

all.css:
	stylus < all.styl > all.raw.css
	csso all.raw.css all.css
	-rm all.raw.css

.PHONY: all all.css
