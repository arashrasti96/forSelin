# A Tiny Question

A standalone, shareable webpage with a smooth, magnetic "No" button that cannot be clicked.

## Publish it with GitHub Pages

1. Create a new **public** repository on GitHub.
2. Push this folder to its `main` branch:

   ```powershell
   git add .
   git commit -m "Create tiny question page"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

3. In the repository, open **Settings** > **Pages**, then set the source to **GitHub Actions**.
4. When the `Deploy site to GitHub Pages` action completes, share:

   ```text
   https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
   ```

For local use, open `index.html` directly in any modern browser.