all:
	$(MAKE) -C blocks/s

popup link:
	$(MAKE) -C blocks $@

test-tools:
	test -x "$(shell which stylus)"
	test -x "$(shell which uglifyjs)"
	test -x "$(shell which csso)"

.PHONY: all test-tools

# TODO: посмотреть на grunt
#       https://github.com/cowboy/grunt
