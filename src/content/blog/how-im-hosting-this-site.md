---
title: How I'm hosting this website
description: An overview of the process and technologies I use to build and host my website
tags:
    - Nginx
    - SSG
    - Hetzner
readingTime: 5
relatedPosts:
    - /projects/shout
createdAt: 15 July 2025
modifiedAt: 02 September 2025
---

I self host this website; I bought a server from Hetzner and a domain from Cloudflare. 

I used to use Astro as my framework but i found it to be a bit overkill for a simple site so I decided to switch to plain HTML, CSS and JS. However there are a lot of niceites you get from frameworks that I miss which led me to build my own Static Site Generator (SSG). I thought it would be a good challenge to just use linux utils so I used the `just` command runner.

```justfile
server_ip := env_var(MY_SERVER_IP)


# Default recipe - build all HTML files
default: build

# Build all HTML files from markdown
build: clean setup-dirs copy-assets blog projects work

# Clean the dist directory
clean:
    rm -rf dist

# Create the directory structure and copy assets
setup-dirs:
    mkdir -p dist/blog
    mkdir -p dist/projects
    mkdir -p dist/work

# Copy CSS and other assets to dist
copy-assets:
    cp style.css dist/style.css

# Generic function to convert markdown files in a section
convert-section section css_path=../style.css:
    #!/usr/bin/env bash
    set -euo pipefail
    for file in content/{{section}}/*.md; do
        filename=$(basename $file .md)
        pandoc $file -o dist/{{section}}/${filename}.html \
            --standalone \
            --template=template.html \
            --metadata pagetitle=${filename} \
            --css={{css_path}}
    done

# Convert blog markdown files to HTML
blog:
    just convert-section blog ../style.css

# Convert projects markdown files to HTML
projects:
    just convert-section projects ../style.css

# Convert work markdown files to HTML
work:
    just convert-section work ../style.css

# Generic function to create an index page for a section
create-section-index section title css_path=./style.css:
    #!/usr/bin/env bash
    set -euo pipefail

    temp_file=temp_{{section}}_index.md
    echo # {{title}} > $temp_file

    for file in content/{{section}}/*.md; do
        [ -f $file ] || continue
        filename=$(basename $file .md)
        title_line=$(head -n 1 $file | sed 's/^# //')
        if [ -z $title_line ]; then
            title_line=$filename
        fi
        echo - [$title_line]($filename.html) >> $temp_file
    done
    cp {{css_path}} ./dist/{{section}}/
    pandoc $temp_file -o dist/{{section}}/index.html --css=./style.css --standalone --metadata pagetitle={{title}} --template=template.html
    rm $temp_file

# Generate index pages for each section
indexes css_path=./style.css:
    just create-section-index blog Blog {{css_path}}
    just create-section-index projects Projects {{css_path}}
    just create-section-index work Work {{css_path}}

# Generate main index page from index.md
main-index:
    #!/usr/bin/env bash
    if [ -f content/index.md ]; then
        pandoc content/index.md -o dist/index.html --standalone --metadata pagetitle=Home --css=style.css --template=template.html

    else
        echo index.md not found, creating a basic one...
        cat > content/index.md << EOF
    Add Content here ...
    EOF
        pandoc content/index.md -o dist/index.html --standalone --metadata pagetitle=Home --css=style.css --template=template.html

    fi

# Build everything including indexes
build-all: build indexes main-index

# Watch for changes and rebuild (requires watchexec)
watch:
    watchexec -e md -i dist -- just build-all

# Serve the site locally
serve:
    cd dist && live-server .

deploy: build-all
    rsync -azP --delete ./dist/ awais@{{server_ip}}:/home/awais/website

# Build and serve
dev: build-all serve
```


Running this command generates a dist folder with the output files.
```bash
just build-all
```

The project structure is:

```bash
.
├── content # Create the content here
│   ├── index.md
│   ├── blog
│   │   ├── blog1.md
│   │   └── ...
│   ├── projects
│   │   ├── project1.md
│   │   └── ...
│   └── work
│   │   ├── work1.md
│   │   └── ...
├── dist # Output folder (contains the html files)
│   ├── index.md
│   ├── blog
│   │   ├── blog1.md
│   │   ├── style.css
│   │   └── ...
│   ├── projects
│   │   ├── project1.md
│   │   ├── style.css
│   │   └── ...
│   └── work
│   │   ├── work1.md
│       └── style.css
│   │   └── ...
│   ├── style.css
│   └── work
│       ├── acument.html
│       ├── index.html
├── draft # Draft Content
│   ├── home-server.md
│   └── linux-setup.md
├── images
│   ├── email.svg
│   ├── github.svg
│   └── linkedin.svg
├── justfile
├── style.css
└── template.html # Base template all other html files inherit from (contains the navbar, footer etc)
```


To upload the site, I use rsync to sync only the changed files. Example:

```bash
just deploy
```

For my main site (awais.me) I use `nginx` as my http server for its stability however you can also view (custom.awais.me) to view the site served by my own custom built server [Volk](/projects/volk). It's basic but functional, and I plan to improve it over time.

For Volk, still use Nginx, but only as a reverse proxy. Volk runs on port 6543, while nginx listens on port 80 and forwards incoming traffic to Volk. This avoids having to reconfigure Volk for port 80.
