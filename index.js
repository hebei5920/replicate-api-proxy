// index.js - Cloudflare Worker 主文件

// 定义环境变量 (在 Cloudflare Dashboard 中设置)
// REPLICATE_API_TOKEN

addEventListener('fetch', event => {
  // 根据请求方法选择合适的处理器
  if (event.request.method === 'OPTIONS') {
    // 处理预检请求
    event.respondWith(handleOptions(event.request));
  } else if (event.request.method === 'POST') {
    // 处理实际的 API 调用
    event.respondWith(handleApiRequest(event.request));
  } else {
    // 处理其他请求方法
    event.respondWith(
      new Response('此代理仅支持 POST 请求', { 
        status: 405,
        headers: corsHeaders 
      })
    );
  }
});

// 定义 CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Prefer',
  'Access-Control-Max-Age': '86400'
};

// 处理 OPTIONS 请求 (预检请求)
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// 处理 API 请求
async function handleApiRequest(request) {
  try {
    // 检查是否设置了 API Token
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ 
          error: 'API Token 未配置。请在 Cloudflare Worker 中设置 REPLICATE_API_TOKEN 环境变量。' 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // 从请求中获取数据
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: '无效的请求数据。请提供有效的 JSON 格式。' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // 创建请求头
    const headers = {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // 添加 Prefer 头 (如果需要)
    if (requestData.prefer === 'wait' || requestData.wait) {
      headers['Prefer'] = 'wait';
      // 从请求中删除这些属性，因为它们不是 API 参数
      delete requestData.prefer;
      delete requestData.wait;
    }

    // 发送请求到 Replicate API
    console.log('发送请求到 Replicate API...');
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });

    // 获取响应数据
    const responseData = await response.json();

    // 返回响应
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
    
  } catch (error) {
    // 处理错误
    console.error('代理请求时出错:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理请求时出错', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
}