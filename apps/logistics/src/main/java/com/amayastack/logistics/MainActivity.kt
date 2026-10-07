package com.amayastack.logistics

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import com.amayastack.shared.Api
import com.amayastack.shared.LoginRequest
import com.amayastack.shared.Tokens
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AmaystackTheme { App() } }
    }
}

@Composable fun AmaystackTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = darkColorScheme(
        background = Color(Tokens.BG.toInt()), surface = Color(Tokens.SURFACE.toInt()),
        primary = Color(Tokens.ACCENT.toInt()), secondary = Color(Tokens.ACCENT_2.toInt()),
        onBackground = Color(Tokens.TEXT.toInt()), onSurface = Color(Tokens.TEXT.toInt()),
        onPrimary = Color.White
    )) { content() }
}

@Composable fun App() {
    var loggedIn by remember { mutableStateOf(Api.token != null) }
    if (!loggedIn) { LoginScreen { loggedIn = true } } else { HomeScreen() }
}

@Composable fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf("admin@amayastack.app") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().padding(24.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center) {
        Text("2A_Stack Logistics", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Physical Movement", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 24.dp))
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = pass, onValueChange = { pass = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp), visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation())
        Text(error, color = Color(Tokens.BAD.toInt()), modifier = Modifier.padding(top = 8.dp))
        Button(onClick = {
            scope.launch {
                try {
                    val r = Api.service().login(LoginRequest(email, pass))
                    Api.token = r.token
                    onLoggedIn()
                } catch (e: Exception) { error = "Login failed — is the backend running?" }
            }
        }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Sign in") }
        Text("Demo: admin@amayastack.app / Stack@2026", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable fun HomeScreen() {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Control Tower", "Shipments", "Warehouses", "Fleet", "Exceptions")
    Scaffold(bottomBar = {
        NavigationBar {
            tabs.forEachIndexed { i, title ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i },
                    icon = { Icon(Icons.Filled.Home, null) }, label = { Text(title, maxLines = 1) })
            }
        }
    }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp)) {
            Text("2A_Stack Logistics", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Physical Movement", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 16.dp))
            when (tab) {
                0 -> TabContent("Control Tower", listOf(Triple("Shipments in Motion","126","98% on schedule"), Triple("In-Transit Value","BDT 22.8M","↑ 6.4% today"), Triple("Delivery Success","97.4%","Best in 90 days"), Triple("Exceptions","9","3 critical")))
                1 -> TabContent("Shipments", listOf(Triple("Shipments","TR-92841 · TR-92836 · TR-92822","Live tracking"), Triple("Documents","POD · Invoice · Packing list","Shared storage")))
                2 -> TabContent("Warehouses", listOf(Triple("Shared warehouses","Created in Distro, shown here","Single entity"), Triple("Dock Scheduling","Inbound appointments","Map view")))
                3 -> TabContent("Fleet", listOf(Triple("Vehicles","38 active · 4 maintenance","Availability"), Triple("Drivers","Licenses · shifts · safety scores","Assignments")))
                4 -> TabContent("Exceptions", listOf(Triple("Delayed / Held / Damaged","Delayed · Address · Customs · Missing · IMEI mismatch · Failed delivery","Realtime notifications"), Triple("Carriers","On-time %, failure rate, cost per carrier","Scorecards")))
            }
        }
    }
}

@Composable fun TabContent(title: String, cards: List<Triple<String, String, String>>) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 12.dp))
    cards.forEach { (h, v, s) ->
        ElevatedCard(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text(h, color = Color(Tokens.TEXT_3.toInt()), fontSize = 12.sp)
                Text(v, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(s, color = Color(Tokens.ACCENT_2.toInt()), fontSize = 12.sp)
            }
        }
    }
}
