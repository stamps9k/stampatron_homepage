# Static site - no build step, just ship the pre-built HTML/CSS/JS into nginx.
FROM nginx:1.30-alpine3.24
COPY www/ /usr/share/nginx/html/

