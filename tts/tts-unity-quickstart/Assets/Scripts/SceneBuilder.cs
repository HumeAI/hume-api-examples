using UnityEngine;

public class SceneBuilder : MonoBehaviour
{
    [Header("⚠️ Set your API key here BEFORE pressing Play!")]
    [SerializeField] private string humeApiKey = "YOUR_HUME_API_KEY_HERE";
    
    void Awake()
    {
        Debug.Log("SceneBuilder Awake()");
    }

    void Start()
    {
        BuildScene();
    }

    void BuildScene()
    {
        GameObject cube = new GameObject("TalkingCube");
        cube.transform.position = Vector3.zero;
        
        GameObject cubeBody = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cubeBody.transform.SetParent(cube.transform);
        cubeBody.transform.localScale = Vector3.one;
        
        // Make it colorful
        Renderer renderer = cubeBody.GetComponent<Renderer>();
        renderer.material.color = Color.HSVToRGB(Random.Range(0f, 1f), 0.8f, 1f);
        
        // Add audio and speech components to parent
        AudioSource audioSource = cube.AddComponent<AudioSource>();
        HumeSpeaker speaker = cube.AddComponent<HumeSpeaker>();
        speaker.audioSource = audioSource;
        speaker.textToSpeak = "I am a talking cube. Hume AI makes me speak!";
        speaker.SetApiKey(humeApiKey);
        
        cube.AddComponent<CubeSpinner>();

        cubeBody.AddComponent<ClickToSpeak>();
        
        // Add instruction text
        GameObject textObject = new GameObject("InstructionText");
        TextMesh textMesh = textObject.AddComponent<TextMesh>();
        textMesh.text = "Click the cube to make it speak!";
        textMesh.fontSize = 20;
        textMesh.color = Color.white;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textObject.transform.position = new Vector3(0, -2, 0);
        textObject.transform.localScale = new Vector3(0.1f, 0.1f, 0.1f);
        
        Camera.main.transform.position = new Vector3(0, 1, -5);
        Camera.main.transform.LookAt(cube.transform);
        
        Debug.Log("Talking Cube created! Click the cube to make it speak.");
    }
}

public class CubeSpinner : MonoBehaviour
{
    public float spinSpeed = 45f;
    private Material material;
    private float hueShift = 0f;
    
    void Start()
    {
        material = GetComponentInChildren<Renderer>().material;
    }
    
    void Update()
    {
        transform.Rotate(Vector3.up * spinSpeed * Time.deltaTime);
        transform.Rotate(Vector3.right * spinSpeed * 0.5f * Time.deltaTime);
        
        hueShift += Time.deltaTime * 0.2f;
        if (hueShift > 1f) hueShift -= 1f;
        
        Color newColor = Color.HSVToRGB(hueShift, 0.8f, 1f);
        material.color = newColor;
    }
}

public class ClickToSpeak : MonoBehaviour
{
    private HumeSpeaker speaker;
    
    void Start()
    {
        speaker = GetComponentInParent<HumeSpeaker>();
    }
    
    void OnMouseDown()
    {
        Debug.Log("Cube clicked!");
        if (speaker != null)
        {
            speaker.Speak();
        }
    }
}