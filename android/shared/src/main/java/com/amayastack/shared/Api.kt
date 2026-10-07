package com.amayastack.shared

import com.google.gson.annotations.SerializedName

data class LoginRequest(val email: String, val password: String)
data class User(val id: Int, val name: String, val email: String, val role: String)
data class LoginResponse(val token: String, val user: User)

interface ApiService {
    @retrofit2.http.POST("/auth/login")
    suspend fun login(@retrofit2.http.Body body: LoginRequest): LoginResponse

    @retrofit2.http.GET("/health")
    suspend fun health(): Map<String, Any>
}

object Api {
    // 10.0.2.2 reaches the host machine from the Android emulator.
    const val BASE_URL = "http://10.0.2.2:8080/"

    @Volatile var token: String? = null

    fun service(): ApiService {
        val okHttp = okhttp3.OkHttpClient.Builder()
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                    .apply { token?.let { addHeader("Authorization", "Bearer it") } }
                    .build()
                chain.proceed(req)
            }
            .build()
        return retrofit2.Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
            .client(okHttp)
            .build()
            .create(ApiService::class.java)
    }
}
