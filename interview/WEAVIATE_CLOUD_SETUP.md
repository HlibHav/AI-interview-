# Weaviate Cloud Setup Guide

## 🚨 **CRITICAL: No Data in Weaviate Cloud**

Your Weaviate Cloud instance shows **0 objects** in all classes, which means:
- No interview sessions are being stored
- No summaries or insights are being generated
- The AI analysis is failing silently

## 🔧 **Quick Fix Steps:**

### 1. **Get Your Weaviate Cloud Credentials**
1. Go to [https://console.weaviate.cloud](https://console.weaviate.cloud)
2. Sign in to your account
3. Select your cluster or create a new one
4. Copy the **Cluster URL** and **API Key**

### 2. **Update Environment Configuration**
Edit the `.env.local` file in the `interview` directory:

```bash
# Weaviate Cloud Configuration
WEAVIATE_HOST=your-cluster-url.weaviate.network
WEAVIATE_API_KEY=your-api-key-here
```

**Example:**
```bash
WEAVIATE_HOST=my-cluster-abc123.weaviate.network
WEAVIATE_API_KEY=sk-1234567890abcdef...
```

### 3. **Test Connection**
After updating the credentials, test the connection:

```bash
curl http://localhost:3000/api/weaviate/test-connection
```

### 4. **Initialize Schema**
Once connected, initialize the database schema:

```bash
curl -X POST http://localhost:3000/api/weaviate/init
```

## 🔍 **Troubleshooting:**

### **Connection Issues:**
- ✅ **Check URL format**: Must end with `.weaviate.network` or `.weaviate.cloud`
- ✅ **Check API key**: Must start with `sk-` or similar
- ✅ **Check HTTPS**: Cloud instances use HTTPS, not HTTP

### **Schema Issues:**
- ✅ **Run initialization**: Call `/api/weaviate/init` after connection
- ✅ **Check classes**: Verify all 11 classes are created
- ✅ **Check permissions**: Ensure API key has write permissions

### **Data Storage Issues:**
- ✅ **Check environment**: Restart server after updating `.env.local`
- ✅ **Check logs**: Look for Weaviate connection errors
- ✅ **Test endpoints**: Use `/api/weaviate/test-connection` to verify

## 📊 **Expected Result:**

After proper setup, you should see:
- ✅ **Connection successful** in test endpoint
- ✅ **11 classes created** in Weaviate Cloud dashboard
- ✅ **Data being stored** when creating sessions
- ✅ **Summaries generated** when completing interviews

## 🚀 **Next Steps:**

1. **Update credentials** in `.env.local`
2. **Restart server** (`npm run dev`)
3. **Test connection** (`/api/weaviate/test-connection`)
4. **Initialize schema** (`/api/weaviate/init`)
5. **Create test session** and verify data storage
6. **Complete interview** and check for insights

---

**Need Help?** Check the server logs for detailed error messages and connection status.
