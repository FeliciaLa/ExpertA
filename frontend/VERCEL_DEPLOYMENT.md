# Deploying ExpertA Frontend to Vercel

This guide explains how to deploy the ExpertA frontend to Vercel.

## Prerequisites

- A GitHub account with access to the ExpertA repository
- A Vercel account (you can sign up at https://vercel.com)

## Deployment Steps

1. **Sign in to Vercel**
   - Go to https://vercel.com and sign in with your account
   - If you haven't created an account yet, you can sign up with your GitHub account

2. **Import Your Repository**
   - Click "Add New" > "Project"
   - Connect your GitHub account if not already connected
   - Find and select the ExpertA repository

3. **Configure Project**
   - Set the following configuration:
     - Framework Preset: Vite
     - Root Directory: `frontend` (important!)
     - Build Command: `npm run build`
     - Output Directory: `dist`

4. **Environment Variables**
   - Add the following environment variable:
     - Name: `VITE_API_URL`
     - Value: Your Railway backend URL (e.g., `https://experta-production.up.railway.app/api`)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete

6. **Update Backend CORS Settings**
   - Once your frontend is deployed, you'll need to update the CORS settings in your backend
   - Add your Vercel domain to the `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `settings.py`

## After Deployment

- Your frontend will be available at the URL provided by Vercel
- Test the connection to your backend by logging in or performing other API calls
- Update the `.env.production` file in your repository with the correct API URL if needed

## Troubleshooting

- If you encounter API connectivity issues, check your CORS settings in the backend
- Ensure environment variables are correctly set in Vercel
- Check the deployment logs for any build errors 