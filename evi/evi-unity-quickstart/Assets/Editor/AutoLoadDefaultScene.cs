using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

[InitializeOnLoad]
public static class AutoLoadDefaultScene
{
    private const string DefaultScenePath = "Assets/DefaultScene.unity";

    static AutoLoadDefaultScene()
    {
        EditorApplication.delayCall += LoadDefaultSceneIfNeeded;
    }

    private static void LoadDefaultSceneIfNeeded()
    {
        // Only load if current scene is untitled (new/empty scene)
        Scene currentScene = SceneManager.GetActiveScene();
        if (string.IsNullOrEmpty(currentScene.path))
        {
            if (System.IO.File.Exists(DefaultScenePath))
            {
                EditorSceneManager.OpenScene(DefaultScenePath);
            }
        }
    }
}
