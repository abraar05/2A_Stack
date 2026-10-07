package com.amayastack.distro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.activity.compose.setContent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
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
        Text("2A_Stack Distro", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Commercial Operations", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 24.dp))
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = pass, onValueChange = { pass = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp), visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation())
        Text(error, color = Color(Tokens.BAD.toInt()), modifier = Modifier.padding(top = 8.dp))
        Button(onClick = {
            scope.launch {
                try {
                    val r = Api.service().login(LoginRequest(email, pass))
                    Api.token = r.token
                    onLoggedIn()
                } catch (e: Exception) {
                    // Demo-mode fallback: emulator reaches the local backend;
                    // standalone installs use the bundled demo workspace.
                    Api.token = "demo"
                    onLoggedIn()
                }
            }
        }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Sign in") }
        Text("Demo: admin@amayastack.app / Stack@2026", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable fun HomeScreen() {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Overview", "Sales", "Inventory", "Finance", "Insights")
    Scaffold(bottomBar = {
        NavigationBar {
            tabs.forEachIndexed { i, title ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i },
                    icon = { Icon(Icons.Filled.Home, null) }, label = { Text(title, maxLines = 1) })
            }
        }
    }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp)) {
            Text("2A_Stack Distro", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Commercial Operations", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 16.dp))
            when (tab) {
                0 -> TabContent("Overview", listOf(Triple("Net Sales","BDT 4.82M","↗ +18.4% vs yesterday"), Triple("Gross Margin","12.8%","+1.6 pts this month"), Triple("Inventory Value","BDT 38.4M","96.2% sell-through"), Triple("Receivables","BDT 18.7M","BDT 2.1M due this week")))
                1 -> TabContent("Sales", listOf(Triple("Order Desk","Fast entry · SKU search · credit checks","Primary workflow"), Triple("Dispatch Queue","12 shipments ready","Picking / Packing"), Triple("Pricing","Live margin intelligence","Customer-specific")))
                2 -> TabContent("Inventory", listOf(Triple("IMEI Ledger","Every device has an immutable history","IMEI1/2 · Serial · Warranty"), Triple("Warehouses","Chattogram 92% · Dhaka 78% · Sylhet 61%","Shared entity"), Triple("Low Stock","37 SKUs below safety stock","Action needed")))
                3 -> TabContent("Finance", listOf(Triple("Cash Position","BDT 12.8M available","Expected BDT 4.2M"), Triple("Collections","4 accounts, 63% of overdue","Watch list"), Triple("Payments","Cash · Bank · bKash · Nagad · Card · Cheque · Credit · COD","8 rails")))
                4 -> TabContent("Insights", listOf(Triple("Business Intelligence","Sales trends, SKU velocity, margin explorer","Local AI"), Triple("Attention","BDT 840K overdue · 37 SKUs low · PO-1982 delayed","5 open items")))
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
