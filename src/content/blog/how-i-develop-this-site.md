---
title: How I develop this site
description: An overview of the process and technologies I use to create, build and host my website
tags:
    - Nginx
    - Astro
    - SSG
    - Hetzner
readingTime: 5
createdAt: 15 July 2025
modifiedAt: 17 October 2025
---
My deployment stack for this site has changed a lot. I first started with a Hugo site deployed on Netlify but then switched to Astro because its documentation felt clearer. After that, I experimented with building my own Static Site Generator (SSG), before eventually returning back to Astro which I hope will remain long-term choice.

At first, both Hugo and Astro felt like overkill for a simple site, so I tried going back to sticking with just HTML, CSS, and JavaScript. But I quickly found myself missing the conveniences that frameworks provide (e.g not having to write the same navbar markup for **EVERY** page), which led me to explore lightweight SSG's. While researching, I thought to myself that a lot of what I was looking for wasn't that hard to build myself so thats what I ended up doing so I decided to experiment building my own SSG. The goal was to keep it lightweight, relying on a single `justfile` to run commands and utilise existing tools like `pandoc` and `rsync` to handle building and deployment.

<details>
<summary>View the code</summary>

```make
server_ip := env_var("MY_SERVER_IP")
set shell := ["bash", "-cu"]

# Takes a markdown file and turns it into an HTML file
build-page file filename section *args="":
    pandoc "{{ file }}" \
    -o "dist/{{ section }}/{{ filename }}.html" \ # where to put the HTML file
    --standalone \ 
    --template=templates/pages/{{ section }}.html \ # What template to use
    --css=style.css \ # what styling to use
    --include-before-body=templates/partials/navbar.html \ # include a navbar
    --include-after-body=templates/partials/footer.html \ # include a footer
    --metadata pagetitle={{ filename }} \ # make the title the filename
    --lua-filter=lua-scripts/anchor.lua # adds a link on every header

# Clean the dist directory
clean:
    rm -rf dist

# Create the directory structure and copy assets
setup-dirs:
    mkdir -p dist
    mkdir -p dist/blog
    mkdir -p dist/projects
    mkdir -p dist/work

# Copy CSS and other assets to dist
copy-assets:
    cp style.css dist/
    cp -r images dist/
    cp -r components dist/
    cp -r content/projects/images dist/projects/
    cp -r content/work/images dist/work/
    cp -r content/blog/images dist/blog/
    cp favicon.ico dist/

# Generic function to convert markdown files in a section
convert-section section css_path="style.css":
    #!/usr/bin/env bash
    set -euo pipefail
    for file in content/{{ section }}/*.md; do
        filename=$(basename "$file" .md)
        if [[ "$filename" != ".archetype" && "$filename" != "index" ]] ; then
            just build-page "$file" "$filename" {{ section }}
        fi
        if [ "$filename" == "index" ] ; then
            pandoc "$file" \
                -o "dist/{{ section }}/index.html" \
                --standalone \
                --css=../style.css \
                --include-before-body=templates/partials/navbar.html \
                --include-after-body=templates/partials/footer.html \
                --metadata pagetitle={{ section }} \
                --template=templates/pages/section-index.html
        fi
    done

# Convert blog markdown files to HTML
blog:
    just convert-section blog "style.css"

# Convert projects markdown files to HTML
projects:
    just convert-section projects "style.css"

# Convert work markdown files to HTML
work:
    just convert-section work "style.css"

# Generate main index page
main-index:
    #!/usr/bin/env bash
    if [ -f "content/index.md" ]; then
        pandoc content/index.md -o dist/index.html --standalone --metadata pagetitle="Home" --css="style.css" --template=templates/pages/base.html --include-before-body=templates/partials/navbar.html --include-after-body=templates/partials/footer.html
    else
        echo "index.md not found, creating a basic one..."
        cat > content/index.md << EOF
        This page is a work in progess... [home](https://awais.me)
    EOF
        pandoc content/index.md -o dist/index.html --standalone --metadata pagetitle="Home" --css="style.css" --template=templates/pages/base.html --include-before-body=templates/partials/navbar.html --include-after-body=templates/partials/footer.html
    fi

# Create a new blog, project, work page
new section title:
    cp content/{{ section }}/.archetype.md content/{{ section }}/{{ title }}.md

# Build everything
build: setup-dirs copy-assets blog projects work main-index
    # indexes

# Watch for changes and rebuild
watch:
    cd content && reflex --regex='\.md$' just build

# Serve the site locally
serve:
    cd dist && live-server .

dev:
    just watch & just serve & wait

deploy: build
    rsync -azP --delete dist/ awais@{{ server_ip }}:/home/awais/website
```
</details>

However, adding new features to my custom SSG quickly became tiresome. Often something would break, and the directory structure constantly needed reworking. While I learned a lot from the process, the project wasn’t sustainable in the long run (Neither was my mental). That’s when I decided to move back to `Astro`, but now I carry forward many of the lessons and approaches I had picked up along the way, especially how I deploy. 

On my server, I keep a website folder that holds the site in `/var/www/html/awais.me/`. Whenever I build locally, I upload the new build and replace the contents of that folder. Initially, this meant deleting everything and copying over the fresh files, but in practice many files (like `styles.css`) don’t change often, or only change slightly. To optimise this, I now use `rsync`, which only updates the files that actually need it, making deployments faster, convenient and efficient.

```bash
rsync -azP --delete dist/ awais@MY_SERVER_IP:/home/awais/website
```

For my http server, I use `nginx` as it has great documentation and is industry standard. 

<!-- For my main site (awais.me) I use `nginx` as my http server for its stability however you can also view (custom.awais.me) to view the site served by my own custom built server [Volk](/projects/volk). It's basic but functional, and I plan to improve it over time. -->
<!---->
<!-- For Volk, still use Nginx, but only as a reverse proxy. Volk runs on port 6543, while nginx listens on port 80 and forwards incoming traffic to Volk. This avoids having to reconfigure Volk for port 80. -->
